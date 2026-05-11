import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ScreenShell from './ScreenShell';
import { useNavigation } from './useNavigation';
import { useGameStore } from '@/architecture/game/store';
import { useLuckStore } from '@/architecture/luck/store';
import Slingshot from '@/components/Slingshot';
import { spring } from '@/design/motion';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';

// ══════════════════════════════════════════════════════════════════════════════
// ⚙️  PHYSICS ENGINE - PRODUCTION LEVEL
// ══════════════════════════════════════════════════════════════════════════════

const PHYSICS = {
  GRAVITY: 0.0038,              // SIGNIFICANTLY INCREASED: Stronger downward pull (was 0.0025)
  AIR_RESISTANCE: 0.992,        // INCREASED FRICTION: Projectile slows faster (was 0.996)
  MIN_POWER: 0.25,              // Minimum pull to fire (25%)
  POWER_MULTIPLIER: 4.8,        // Adjusted for new gravity/friction (was 4.5)
  TRAJECTORY_SAMPLES: 60,       // Points to calculate for trajectory preview
  WIND_CHANGE_INTERVAL: 4000,  // Wind changes every 4 seconds
  WIND_MAX_FORCE: 0.0022,       // INCREASED WIND: External factors more punishing (was 0.0015)
} as const;

const JAR_POSITIONS = [
  { x: 12.5, y: 22, label: 'Left' },
  { x: 37.5, y: 22, label: 'Center-Left' },
  { x: 62.5, y: 22, label: 'Center-Right' },
  { x: 87.5, y: 22, label: 'Right' },
] as const;

const HIT_RADIUS = 8; // Percentage units for collision detection

// ══════════════════════════════════════════════════════════════════════════════
// 🌬️  CANVAS-BASED GHOST STREAK WIND
// ══════════════════════════════════════════════════════════════════════════════

interface Wind {
  force: number;      // -1 to 1 (negative = left, positive = right)
  direction: 'left' | 'right' | 'calm';
  strength: 'calm' | 'light' | 'medium' | 'strong';
}

function PhysicalWind({
  wind,
  visible,
}: {
  wind: Wind;
  visible: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!visible || wind.strength === 'calm') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Force canvas to full arena size for visibility
    canvas.width = canvas.offsetWidth || 800;
    canvas.height = canvas.offsetHeight || 300;

    const W = canvas.width;
    const H = canvas.height;
    const isLeft = wind.direction === 'left';

    const speedMap = { calm: 1, light: 0.008, medium: 0.014, strong: 0.022 };
    const countMap = { calm: 0, light: 5, medium: 8, strong: 12 };

    const baseSpeed = speedMap[wind.strength] ?? 0.012;
    const count = countMap[wind.strength] ?? 0;

    // SVG path helper — get points along a bezier path
    function getPathPoints(d: string): { x: number; y: number }[] {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.style.cssText = 'position:absolute;width:0;height:0;visibility:hidden;';
      document.body.appendChild(svg);

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      svg.appendChild(path);

      const len = path.getTotalLength();
      const pts: { x: number; y: number }[] = [];

      for (let i = 0; i <= 120; i++) {
        const pt = path.getPointAtLength((i / 120) * len);
        pts.push({ x: pt.x, y: pt.y });
      }

      document.body.removeChild(svg);
      return pts;
    }

    // Define curved S-path generators - constrained to middle zone (30% to 70% height)
    const pathFns = [
      () => `M ${-W * 0.1} ${H * 0.35} Q ${W * 0.25} ${H * 0.28} ${W * 0.5} ${H * 0.38} T ${W * 1.1} ${H * 0.32}`,
      () => `M ${-W * 0.1} ${H * 0.48} Q ${W * 0.3} ${H * 0.42} ${W * 0.6} ${H * 0.52} S ${W * 0.85} ${H * 0.45} ${W * 1.1} ${H * 0.5}`,
      () => `M ${-W * 0.1} ${H * 0.58} Q ${W * 0.2} ${H * 0.52} ${W * 0.45} ${H * 0.62} T ${W * 0.75} ${H * 0.56} T ${W * 1.1} ${H * 0.6}`,
      () => `M ${-W * 0.1} ${H * 0.42} Q ${W * 0.28} ${H * 0.36} ${W * 0.55} ${H * 0.45} S ${W * 0.82} ${H * 0.38} ${W * 1.1} ${H * 0.43}`,
      () => `M ${-W * 0.1} ${H * 0.65} Q ${W * 0.32} ${H * 0.58} ${W * 0.62} ${H * 0.68} T ${W * 1.1} ${H * 0.62}`,
      () => `M ${-W * 0.1} ${H * 0.38} Q ${W * 0.22} ${H * 0.32} ${W * 0.48} ${H * 0.42} S ${W * 0.78} ${H * 0.35} ${W * 1.1} ${H * 0.4}`,
      () => `M ${-W * 0.1} ${H * 0.52} Q ${W * 0.35} ${H * 0.46} ${W * 0.65} ${H * 0.55} T ${W * 1.1} ${H * 0.5}`,
      () => `M ${-W * 0.1} ${H * 0.45} Q ${W * 0.26} ${H * 0.38} ${W * 0.52} ${H * 0.48} S ${W * 0.8} ${H * 0.42} ${W * 1.1} ${H * 0.46}`,
      () => `M ${-W * 0.1} ${H * 0.55} Q ${W * 0.3} ${H * 0.48} ${W * 0.58} ${H * 0.58} T ${W * 1.1} ${H * 0.53}`,
      () => `M ${-W * 0.1} ${H * 0.62} Q ${W * 0.24} ${H * 0.56} ${W * 0.5} ${H * 0.65} S ${W * 0.76} ${H * 0.58} ${W * 1.1} ${H * 0.63}`,
      () => `M ${-W * 0.1} ${H * 0.4} Q ${W * 0.33} ${H * 0.34} ${W * 0.6} ${H * 0.43} T ${W * 1.1} ${H * 0.38}`,
      () => `M ${-W * 0.1} ${H * 0.5} Q ${W * 0.27} ${H * 0.44} ${W * 0.54} ${H * 0.53} S ${W * 0.83} ${H * 0.47} ${W * 1.1} ${H * 0.51}`,
    ];

    interface Gust {
      points: { x: number; y: number }[];
      progress: number;
      speed: number;
      segLen: number;
      maxW: number;
      pathFn: () => string;
    }

    const gusts: Gust[] = pathFns.slice(0, count).map((fn, i) => ({
      points: getPathPoints(fn()),
      progress: -(i * 0.15),
      speed: baseSpeed + Math.random() * 0.004,
      segLen: 0.12 + Math.random() * 0.08,
      maxW: 1.5 + Math.random() * 1.0, // Thinner: 1.5 to 2.5
      pathFn: fn,
    }));

    // Store ctx in a const to satisfy TypeScript
    const context = ctx;

    function loop() {
      context.clearRect(0, 0, W, H);

      for (const g of gusts) {
        g.progress += g.speed;

        if (g.progress > 1 + g.segLen) {
          g.progress = -0.05 - Math.random() * 0.1;
          g.speed = baseSpeed + Math.random() * 0.004;
          g.segLen = 0.12 + Math.random() * 0.08;
          g.maxW = 1.5 + Math.random() * 1.0; // Thinner
          g.points = getPathPoints(g.pathFn());
        }

        const head = Math.min(1, Math.max(0, g.progress));
        const tail = Math.min(1, Math.max(0, g.progress - g.segLen));

        if (head <= tail) continue;

        const total = g.points.length - 1;
        const hi = Math.round(head * total);
        const ti = Math.round(tail * total);
        const seg = hi - ti;

        if (seg < 2) continue;

        // Flip x for leftward wind
        const px = (x: number) => (isLeft ? W - x : x);

        for (let i = ti + 1; i <= hi; i++) {
          const p = g.points[i];
          const prev = g.points[i - 1];

          if (!p || !prev) continue;

          const localT = (i - ti) / seg;
          const taper = Math.sin(localT * Math.PI);

          context.beginPath();
          context.moveTo(px(prev.x), prev.y);
          context.lineTo(px(p.x), p.y);
          // Lighter, more subtle wind streaks
          context.strokeStyle = `rgba(120,100,80,${taper * 0.4})`;
          context.lineWidth = taper * g.maxW;
          context.lineCap = 'round';
          context.stroke();
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(rafRef.current);
  }, [visible, wind.strength, wind.direction]);

  if (!visible || wind.strength === 'calm') return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 8,
      }}
    />
  );
}

function generateWind(): Wind {
  const roll = Math.random();
  let force: number;
  let strength: Wind['strength'];
  
  if (roll < 0.15) {
    // 15% - Calm
    force = (Math.random() - 0.5) * 0.1;
    strength = 'calm';
  } else if (roll < 0.50) {
    // 35% - Light wind
    force = (Math.random() - 0.5) * 0.4;
    strength = 'light';
  } else if (roll < 0.85) {
    // 35% - Medium wind
    force = (Math.random() - 0.5) * 0.7;
    strength = 'medium';
  } else {
    // 15% - Strong wind (gambling element!)
    force = (Math.random() - 0.5) * 1.0;
    strength = 'strong';
  }
  
  const direction = force < -0.05 ? 'left' : force > 0.05 ? 'right' : 'calm';
  
  return { force, direction, strength };
}

// ══════════════════════════════════════════════════════════════════════════════
// 🎯  TRAJECTORY CALCULATION
// ══════════════════════════════════════════════════════════════════════════════

interface TrajectoryPoint {
  x: number;
  y: number;
}

function calculateTrajectory(
  pullX: number,
  pullY: number,
  windForce: number
): TrajectoryPoint[] {
  const power = pullY;
  if (power < PHYSICS.MIN_POWER) return [];
  
  const angle = pullX; // -1 (left) to 1 (right)
  let vx = angle * power * PHYSICS.POWER_MULTIPLIER * 0.8;
  let vy = -power * PHYSICS.POWER_MULTIPLIER;
  
  let x = 50; // Start at center (50%)
  let y = 82; // Start at slingshot position (82% from top)
  
  const points: TrajectoryPoint[] = [{ x, y }];
  
  for (let i = 0; i < PHYSICS.TRAJECTORY_SAMPLES; i++) {
    // Apply physics
    vy += PHYSICS.GRAVITY;
    vx *= PHYSICS.AIR_RESISTANCE;
    vy *= PHYSICS.AIR_RESISTANCE;
    
    // Apply wind
    vx += windForce * PHYSICS.WIND_MAX_FORCE * 100;
    
    x += vx;
    y += vy;
    
    // Stop if out of bounds or hit ground
    if (y > 100 || x < 0 || x > 100 || y < 0) break;
    
    points.push({ x, y });
  }
  
  return points;
}

// ══════════════════════════════════════════════════════════════════════════════
// 🎲  HIT DETECTION - GAMBLING ALGORITHM
// ══════════════════════════════════════════════════════════════════════════════

function checkHit(trajectory: TrajectoryPoint[]): number | null {
  // Check each point in trajectory against jar positions
  for (const point of trajectory) {
    // Only check points near jar height (within 10% vertical range)
    if (Math.abs(point.y - JAR_POSITIONS[0].y) > 10) continue;
    
    for (let i = 0; i < JAR_POSITIONS.length; i++) {
      const jar = JAR_POSITIONS[i];
      const distance = Math.sqrt(
        Math.pow(point.x - jar.x, 2) + Math.pow(point.y - jar.y, 2)
      );
      
      if (distance < HIT_RADIUS) {
        return i; // HIT!
      }
    }
  }
  
  return null; // MISS
}

// ══════════════════════════════════════════════════════════════════════════════
// 📊  GAME DATA
// ══════════════════════════════════════════════════════════════════════════════

const ROUNDS = [
  {
    id: 'return',
    question: 'Would you come back?',
    answers: ['Definitely returning!', 'My new regular', 'Maybe someday', 'Once was enough'],
  },
  {
    id: 'recommend',
    question: 'Would you recommend it?',
    answers: ['Highly recommend!', 'Must try!', 'Not for everyone', 'Would skip'],
  },
  {
    id: 'price',
    question: 'Was it worth the price?',
    answers: ['Worth every penny', 'Great value!', 'A bit pricey', 'Overpriced'],
  },
];

interface SpilledPhrase {
  text: string;
  id: string;
  x: number;
  y: number;
  rotation: number;
  delay: number;
}

interface ProjectileState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  trail: TrajectoryPoint[];
}

// ══════════════════════════════════════════════════════════════════════════════
// 🎮  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function SlingshotGameScreen() {
  const go = useNavigation((s) => s.go);
  const addSlingshotAnswer = useGameStore((s) => s.addSlingshotAnswer);
  const setSlingshotLuck = useLuckStore((s) => s.setSlingshotLuck);

  // ── Game state ──
  const [roundIdx, setRoundIdx] = useState(0);
  const [phase, setPhase] = useState<'aiming' | 'flying' | 'hit' | 'miss' | 'complete'>('aiming');
  const [retryCount, setRetryCount] = useState(0); // Track retries per round

  // ── Slingshot state ──
  const [pullX, setPullX] = useState(0);
  const [pullY, setPullY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [fired, setFired] = useState(false);
  const [predictedJarIdx, setPredictedJarIdx] = useState<number | null>(null);

  // ── Wind state ──
  const [wind, setWind] = useState<Wind>(generateWind());
  
  // ── Projectile state ──
  const [projectile, setProjectile] = useState<ProjectileState | null>(null);
  const [hitAnswerIdx, setHitAnswerIdx] = useState<number | null>(null);
  
  // ── UI state ──
  const [spilled, setSpilled] = useState<SpilledPhrase[]>([]);
  const [shaking, setShaking] = useState(false);
  const [pickedAnswer, setPickedAnswer] = useState<string | null>(null);
  const [showPowerWarning, setShowPowerWarning] = useState(false);

  // ── Refs ──
  const arenaRef = useRef<HTMLDivElement>(null);
  const shelfRef = useRef<HTMLDivElement>(null);
  const jarsRowRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const lastPullYBucket = useRef(0);
  const lastAimedJarRef = useRef<number | null>(null);
  const intendedJarRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const windTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastDrawProgressRef = useRef(0);

  const currentRound = ROUNDS[roundIdx];

  // ── Wind system: Change wind periodically ──
  useEffect(() => {
    windTimerRef.current = setInterval(() => {
      if (phase === 'aiming') {
        setWind(generateWind());
        haptics.bump();
      }
    }, PHYSICS.WIND_CHANGE_INTERVAL);

    return () => {
      if (windTimerRef.current) clearInterval(windTimerRef.current);
    };
  }, [phase]);

  // ══════════════════════════════════════════════════════════════════════════════
  // 🎯  POINTER HANDLERS
  // ══════════════════════════════════════════════════════════════════════════════

  function handlePointerDown(e: React.PointerEvent) {
    if (phase !== 'aiming') return;
    const rect = arenaRef.current?.getBoundingClientRect();
    if (!rect) return;
    const relY = (e.clientY - rect.top) / rect.height;
    const relX = (e.clientX - rect.left) / rect.width;
    if (relY < 0.4 || relX < 0.1 || relX > 0.9) return;

    setIsDragging(true);
    setShowPowerWarning(false);
    dragStart.current = { x: e.clientX, y: e.clientY };
    lastPullYBucket.current = 0;
    lastDrawProgressRef.current = 0;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDragging || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    const maxDrag = 140;
    const newPullX = Math.max(-1, Math.min(1, -dx / maxDrag));
    const newPullY = Math.max(0, Math.min(1, dy / maxDrag));

    setPullX(newPullX);
    setPullY(newPullY);

    // Audio: Elastic stretch sound with creaking rubber texture
    if (isDragging && newPullY > PHYSICS.MIN_POWER * 0.5) {
      if (Math.abs(newPullY - lastDrawProgressRef.current) > 0.04) {
        audio.draw(newPullY);
        lastDrawProgressRef.current = newPullY;
      }
    }

    // Real-time trajectory prediction for jar highlighting
    if (newPullY >= PHYSICS.MIN_POWER) {
      const trajectory = calculateTrajectory(newPullX, newPullY, wind.force);
      const hitIdx = checkHit(trajectory);
      setPredictedJarIdx(hitIdx);
      if (hitIdx !== null) {
        lastAimedJarRef.current = hitIdx;
      }
    } else {
      setPredictedJarIdx(null);
    }

    // Escalating haptic feedback
    const bucket = Math.floor(newPullY / 0.08);
    if (bucket > lastPullYBucket.current) {
      if (newPullY < 0.18) haptics.slingshotDragLight();
      else if (newPullY < 0.38) haptics.slingshotDragMedium();
      else haptics.slingshotDragHeavy();
      lastPullYBucket.current = bucket;
    }
  }

  function handlePointerUp() {
    if (!isDragging) return;
    setIsDragging(false);
    dragStart.current = null;
    setPredictedJarIdx(null); // Clear highlight on release
    lastDrawProgressRef.current = 0;

    // Check minimum power requirement
    if (pullY < PHYSICS.MIN_POWER) {
      setPullX(0);
      setPullY(0);
      setShowPowerWarning(true);
      haptics.bump();
      setTimeout(() => setShowPowerWarning(false), 2000);
      lastAimedJarRef.current = null;
      return;
    }

    // Commit the intended signal (the jar they were aiming at)
    if (lastAimedJarRef.current !== null) {
      const answerIdx = lastAimedJarRef.current;
      const answer = currentRound.answers[answerIdx];
      
      addSlingshotAnswer({
        questionId: currentRound.id,
        question: currentRound.question,
        positive: answerIdx < 2,
        phrase: answer,
      });
      
      lastAimedJarRef.current = null;
    }

    fire();
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // 🚀  FIRE PROJECTILE - REAL PHYSICS SIMULATION
  // ══════════════════════════════════════════════════════════════════════════════

  function fire() {
    setFired(true);
    setPhase('flying');
    audio.release(); // Switched to release for better feeling
    haptics.slingshotRelease();

    // Calculate initial velocity
    const power = pullY;
    const angle = pullX;
    let vx = angle * power * PHYSICS.POWER_MULTIPLIER * 0.8;
    let vy = -power * PHYSICS.POWER_MULTIPLIER;

    // Calculate full trajectory for hit detection
    const fullTrajectory = calculateTrajectory(pullX, pullY, wind.force);
    const hitIdx = checkHit(fullTrajectory);

    // Initialize projectile state
    const initialProjectile: ProjectileState = {
      x: 50,
      y: 82,
      vx,
      vy,
      trail: [],
    };

    setProjectile(initialProjectile);

    // Animate projectile with real physics
    let currentProjectile = { ...initialProjectile };
    let frameCount = 0;
    const maxFrames = 120;

    const animate = () => {
      frameCount++;

      // Apply physics
      currentProjectile.vy += PHYSICS.GRAVITY;
      currentProjectile.vx *= PHYSICS.AIR_RESISTANCE;
      currentProjectile.vy *= PHYSICS.AIR_RESISTANCE;

      // Apply wind force
      currentProjectile.vx += wind.force * PHYSICS.WIND_MAX_FORCE * 100;

      // Update position
      currentProjectile.x += currentProjectile.vx;
      currentProjectile.y += currentProjectile.vy;

      // Add to trail
      currentProjectile.trail.push({ x: currentProjectile.x, y: currentProjectile.y });
      if (currentProjectile.trail.length > 15) currentProjectile.trail.shift();

      setProjectile({ ...currentProjectile });

      // Check if hit jar
      if (hitIdx !== null) {
        const jar = JAR_POSITIONS[hitIdx];
        const distance = Math.sqrt(
          Math.pow(currentProjectile.x - jar.x, 2) + 
          Math.pow(currentProjectile.y - jar.y, 2)
        );

        if (distance < HIT_RADIUS) {
          // HIT!
          if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
          smashJar(hitIdx);
          return;
        }
      }

      // Check if out of bounds or max frames
      if (
        currentProjectile.y > 100 ||
        currentProjectile.x < -10 ||
        currentProjectile.x > 110 ||
        currentProjectile.y < -10 ||
        frameCount > maxFrames
      ) {
        // MISS!
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        handleMiss();
        return;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  }

  function handleMiss() {
    setPhase('miss');
    setProjectile(null);
    audio.boo(); // Use boo on miss
    haptics.slingshotMiss();
    setTimeout(() => {
      setPullX(0);
      setPullY(0);
      setFired(false);
    }, 100);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // 💥  JAR SMASH & GAME FLOW
  // ══════════════════════════════════════════════════════════════════════════════

  function smashJar(answerIdx: number) {
    const answer = currentRound.answers[answerIdx];
    setPhase('hit');
    setHitAnswerIdx(answerIdx);
    setProjectile(null);
    setShaking(true);
    haptics.jarCrack();
    audio.jarShatter(); // New jar shatter sound

    // Accuracy scoring
    const intended = intendedJarRef.current;
    const isAccurate = intended !== null && answerIdx === intended;
    const maxLuck = 35; // Total possible luck for Slingshot game
    const roundLuck = Math.floor(maxLuck / ROUNDS.length);
    const points = isAccurate ? roundLuck : Math.floor(roundLuck / 2);
    setSlingshotLuck(points / maxLuck);

    setTimeout(() => setShaking(false), 500);

    setSpilled([
      {
        text: answer,
        id: `answer-${answerIdx}`,
        x: 50 + (Math.random() - 0.5) * 30,
        y: 60,
        rotation: (Math.random() - 0.5) * 15,
        delay: 0.2,
      },
    ]);

    setTimeout(() => handleAnswerPick(answer, answerIdx), 1200);
  }

  function handleAnswerPick(answer: string, _answerIdx: number) {
    if (pickedAnswer) return;
    setPickedAnswer(answer);
    audio.tick();
    haptics.tick();

    // NOTE: Signal now committed on release in handlePointerUp
    // This function now only handles the UI advancement after impact.

    setTimeout(() => {
      advanceRound();
    }, 800);
  }

  function advanceRound() {
    if (roundIdx < ROUNDS.length - 1) {
      setRoundIdx(roundIdx + 1);
      setRetryCount(0); // Reset retry count for new round
      resetForNextRound();
    } else {
      finishGame();
    }
  }

  function resetForNextRound() {
    setPhase('aiming');
    setHitAnswerIdx(null);
    setPredictedJarIdx(null);
    setSpilled([]);
    setFired(false);
    setProjectile(null);
    setPickedAnswer(null);
    setPullX(0);
    setPullY(0);
    setWind(generateWind()); // New wind for new round
  }

  function finishGame() {
    setPhase('complete');
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (windTimerRef.current) clearInterval(windTimerRef.current);

    const answers = useGameStore.getState().slingshotAnswers;
    const positiveRatio = answers.length > 0
      ? answers.filter((a) => a.positive).length / answers.length
      : 0;
    setSlingshotLuck(positiveRatio);
  }

  function handleMissRetry() {
    if (retryCount >= 1) {
      // Already retried once - skip to spin wheel
      go('shellGame');
    } else {
      // First miss - allow one retry
      setRetryCount(retryCount + 1);
      resetForNextRound();
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (windTimerRef.current) clearInterval(windTimerRef.current);
    };
  }, []);

  // ══════════════════════════════════════════════════════════════════════════════
  // 🎨  RENDER - COMPLETE PHASE
  // ══════════════════════════════════════════════════════════════════════════════

  if (phase === 'complete') {
    return (
      <ScreenShell hideProgress hideBack>
        <motion.div
          className="flex-1 flex flex-col justify-center items-center text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={spring.gentle}
          onAnimationComplete={() => {
            setTimeout(() => go('shellGame'), 1800);
          }}
        >
          <motion.div
            className="text-7xl mb-4"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ ...spring.snappy, delay: 0.15 }}
          >
            🏆
          </motion.div>
          <h2 className="text-display text-ink mb-2">Perfect Score!</h2>
          <p className="text-body text-ink-secondary mb-6">All 3 rounds completed · Generating your review</p>
          <p className="text-ink-tertiary text-caption mt-8">Building your personalized experience…</p>
        </motion.div>
      </ScreenShell>
    );
  }

  // ── Miss phase ──
  if (phase === 'miss') {
    const isLastChance = retryCount >= 1;
    
    return (
      <ScreenShell hideProgress hideBack>
        <motion.div
          className="flex-1 flex flex-col justify-center items-center text-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="text-7xl mb-4"
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={spring.snappy}
          >
            {isLastChance ? '😵' : '💨'}
          </motion.div>
          <h2 className="text-display text-ink mb-2">
            {isLastChance ? 'Last Chance Used!' : 'Missed!'}
          </h2>
          <p className="text-body text-ink-secondary mb-2">
            {isLastChance 
              ? 'You already used your retry'
              : 'Stone flew past the jars'}
          </p>
          <p className="text-caption text-ink-tertiary mb-8">
            {isLastChance
              ? 'Moving to spin the wheel...'
              : wind.strength !== 'calm' && 'Wind affected your shot!'}
          </p>
          <motion.button
            onClick={handleMissRetry}
            className="px-6 py-3 rounded-full font-semibold text-label text-white"
            style={{ background: 'linear-gradient(135deg, #E8B896, #C67C4E)' }}
            whileTap={{ scale: 0.95 }}
          >
            {isLastChance ? 'Continue to Spin Wheel' : 'Retry This Round (1 chance)'}
          </motion.button>
        </motion.div>
      </ScreenShell>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // 🎨  RENDER - PLAYING PHASE
  // ══════════════════════════════════════════════════════════════════════════════

  const isPowerSufficient = pullY >= PHYSICS.MIN_POWER;
  
  const turnLabel = pickedAnswer ? 'Moving to next round...' :
    hitAnswerIdx !== null ? 'Tap to confirm!' :
    isDragging ? (isPowerSufficient ? `Aiming... 🎯` : `Pull more!`) :
    'Pull the slingshot to aim';

  return (
    <ScreenShell hideProgress hideBack>
      <motion.div
        className="flex-1 flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* ── Header ── */}
        <motion.div
          className="text-center mb-3"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring.gentle}
        >
          <div
            className="inline-flex items-center gap-2 text-primary px-4 py-1.5 rounded-full text-label font-semibold mb-3"
            style={{ background: 'rgba(198,124,78,0.1)', border: '1px solid rgba(198,124,78,0.2)' }}
          >
            <span>Round {roundIdx + 1} of {ROUNDS.length}</span>
            <span className="text-primary/50">—</span>
            <span>Slingshot</span>
          </div>

          <h3 className="text-heading text-ink mb-2">{currentRound.question}</h3>
          <p className="text-ink-secondary text-label">{turnLabel}</p>
        </motion.div>

        {/* ── Power Warning ── */}
        <AnimatePresence>
          {showPowerWarning && (
            <motion.div
              className="text-center mb-2"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <span className="text-micro text-red-600 font-semibold">
                ⚠️ Pull back at least 25% to fire!
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Game arena ── */}
        <motion.div
          ref={arenaRef}
          animate={shaking ? { x: [0, -6, 6, -4, 4, -2, 2, 0] } : {}}
          transition={{ duration: 0.5 }}
          className="relative h-[340px] rounded-2xl overflow-hidden touch-none select-none flex-1"
          style={{
            background: 'rgba(251,247,244,0.95)',
            backgroundImage: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(198,124,78,0.04) 0%, transparent 60%)',
            border: '1px solid rgba(200,170,140,0.2)',
            boxShadow: '0px 4px 20px rgba(0,0,0,0.06)',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => {
            if (isDragging) {
              setIsDragging(false);
              setPullX(0);
              setPullY(0);
              setPredictedJarIdx(null);
              dragStart.current = null;
              lastDrawProgressRef.current = 0;
            }
          }}
        >
          <PhysicalWind
            wind={wind}
            visible={phase === 'aiming' || phase === 'flying'}
          />

          {/* Wind strength badge */}
          <AnimatePresence>
            {wind.direction !== 'calm' && (phase === 'aiming' || phase === 'flying') && (
              <div
                className="absolute top-3 right-3 z-10 pointer-events-none"
              >
                <motion.div
                  key={wind.strength}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-xs px-2 py-1 rounded-full bg-black/10 text-ink-secondary"
                >
                  {wind.strength === 'light' && '🌬 Light wind'}
                  {wind.strength === 'medium' && '💨 Medium wind'}
                  {wind.strength === 'strong' && '🌪 Strong wind'}
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Shelf line — warm tan */}
          <div ref={shelfRef} className="absolute bottom-[42%] left-4 right-4 h-[2px] rounded-full" style={{ background: 'rgba(200,170,140,0.3)' }} />

          {/* 4 Answer jars with labels - WITH REAL-TIME PREDICTION HIGHLIGHTING */}
          <div ref={jarsRowRef} className="absolute inset-0 pointer-events-none">
            {currentRound.answers.map((answer, idx) => {
              const jar = JAR_POSITIONS[idx];
              const isHit = hitAnswerIdx === idx;
              const isPredicted = predictedJarIdx === idx;

              return (
                <div
                  key={idx}
                  className="absolute pointer-events-auto"
                  style={{ left: `${jar.x}%`, top: `${jar.y}%`, transform: 'translate(-50%, -50%)' }}
                >
                  <AnimatePresence mode="wait">
                    {!isHit ? (
                      <motion.div
                        key={`jar-${idx}-intact`}
                        className="flex flex-col items-center gap-2"
                        animate={{
                          scale: isPredicted ? 1.15 : 1,
                          filter: isPredicted 
                            ? 'drop-shadow(0px 0px 12px rgba(198,124,78,0.4))' 
                            : 'drop-shadow(0px 4px 8px rgba(0,0,0,0.10))',
                        }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        exit={{ scale: [1, 1.3, 0], opacity: [1, 1, 0], transition: { duration: 0.4 } }}
                      >
                        <span className="text-5xl leading-none" style={{ filter: isPredicted ? 'none' : 'grayscale(0.1)' }}>
                          🏺
                        </span>
                        {/* Label below jar */}
                        <div
                          className="px-2 py-1 rounded-lg text-micro font-semibold text-center max-w-[80px] leading-tight transition-colors duration-200"
                          style={{
                            background: isPredicted ? '#FFF8F3' : 'rgba(255,255,255,0.9)',
                            color: isPredicted ? '#C67C4E' : '#7A5C4A',
                            border: isPredicted ? '1.5px solid #C67C4E' : '1px solid rgba(200,170,140,0.2)',
                            boxShadow: isPredicted ? '0px 4px 12px rgba(198,124,78,0.2)' : '0px 2px 4px rgba(0,0,0,0.08)',
                          }}
                        >
                          {answer}
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key={`jar-${idx}-broken`}
                        initial={{ scale: 2, opacity: 0 }}
                        animate={{ scale: 1, opacity: 0.5 }}
                        className="flex flex-col items-center"
                      >
                        <span className="text-3xl">💥</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Slingshot */}
          <div className="absolute left-1/2 bottom-[6%] -translate-x-1/2 z-10 scale-125">
            <Slingshot pullX={pullX} pullY={pullY} isDragging={isDragging} fired={fired} />
            {!isDragging && hitAnswerIdx === null && phase === 'aiming' && (
              <motion.p
                className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-micro text-ink-tertiary"
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                pull back to shoot
              </motion.p>
            )}
          </div>

          {/* Flying projectile with trail */}
          {projectile && (
            <>
              {/* Trail */}
              {projectile.trail.map((point, i) => (
                <div
                  key={`trail-${i}`}
                  className="absolute pointer-events-none"
                  style={{
                    left: `${point.x}%`,
                    top: `${point.y}%`,
                    transform: `${(point.x - 50) * 0.1}deg`,
                  }}
                >
                  <div
                    className="rounded-full"
                    style={{
                      width: 4 + i * 0.3,
                      height: 4 + i * 0.3,
                      background: `rgba(198,124,78,${0.2 + i * 0.05})`,
                    }}
                  />
                </div>
              ))}
              {/* Projectile */}
              <div
                className="absolute z-20 pointer-events-none"
                style={{
                  left: `${projectile.x}%`,
                  top: `${projectile.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16">
                  <circle cx="8" cy="8" r="7" fill="#C67C4E" stroke="#8B4513" strokeWidth="1" />
                </svg>
              </div>
            </>
          )}

          {/* Impact flash — warm coffee tint */}
          <AnimatePresence>
            {shaking && (
              <motion.div
                key="flash"
                initial={{ opacity: 0.4 }}
                animate={{ opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 pointer-events-none z-20 rounded-2xl"
                style={{ background: 'rgba(198,124,78,0.15)' }}
              />
            )}
          </AnimatePresence>

          {/* Shards from broken jar */}
          <AnimatePresence>
            {hitAnswerIdx !== null && (
              <>
                {Array.from({ length: 6 }).map((_, i) => (
                  <motion.div
                    key={`shard-${i}`}
                    className="absolute text-sm pointer-events-none"
                    style={{ left: `${JAR_POSITIONS[hitAnswerIdx].x}%`, top: `${JAR_POSITIONS[hitAnswerIdx].y}%` }}
                    initial={{ scale: 1, opacity: 1 }}
                    animate={{
                      x: (Math.random() - 0.5) * 120,
                      y: [0, -25 - Math.random() * 30, 70 + Math.random() * 40],
                      rotate: Math.random() * 480 - 240,
                      opacity: [1, 1, 0],
                      scale: [1, 1.1, 0.2],
                    }}
                    transition={{ duration: 0.9 + Math.random() * 0.4, ease: 'easeOut' }}
                  >
                    {['✨', '💫', '⭐', '🪨'][i % 4]}
                  </motion.div>
                ))}
              </>
            )}
          </AnimatePresence>

          {/* Spilled answer — white card with coffee accent */}
          <AnimatePresence>
            {spilled.map((item) => (
              <motion.button
                key={item.id}
                className={`absolute z-30 ${hitAnswerIdx !== null && !pickedAnswer ? 'cursor-pointer' : 'pointer-events-none'}`}
                style={{ left: `${item.x}%`, top: `${item.y}%` }}
                initial={{ scale: 0, opacity: 0, y: -35 }}
                animate={{
                  scale: pickedAnswer ? 1.15 : 1,
                  opacity: 1,
                  y: 0,
                  rotate: item.rotation,
                }}
                exit={{ scale: 0, opacity: 0, y: 15 }}
                transition={{ delay: item.delay, type: 'spring', stiffness: 250, damping: 18 }}
                onClick={(e) => { e.stopPropagation(); handleAnswerPick(item.text, parseInt(item.id.replace('answer-', ''), 10)); }}
              >
                <motion.div
                  className="px-3 py-1.5 rounded-full text-label font-semibold whitespace-nowrap transition-colors"
                  style={pickedAnswer ? {
                    background: 'linear-gradient(135deg, #E8B896, #C67C4E)',
                    color: '#FFFFFF',
                    border: '1px solid rgba(198,124,78,0.4)',
                    boxShadow: '0px 4px 12px rgba(198,124,78,0.3)',
                  } : {
                    background: '#FFFFFF',
                    color: '#C67C4E',
                    border: '1px solid rgba(198,124,78,0.3)',
                    boxShadow: '0px 2px 8px rgba(0,0,0,0.08)',
                  }}
                  animate={hitAnswerIdx !== null && !pickedAnswer ? { y: [0, -3, 0] } : {}}
                  transition={{ repeat: Infinity, duration: 1.5, delay: item.delay }}
                >
                  {pickedAnswer && '✓ '}
                  {item.text}
                </motion.div>
              </motion.button>
            ))}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </ScreenShell>
  );
}
