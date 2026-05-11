import { useState, useRef, useEffect } from 'react';
import {
  motion, AnimatePresence,
  useMotionValue, useSpring, animate,
  type MotionValue,
} from 'framer-motion';
import ScreenShell from './ScreenShell';
import { useNavigation } from './useNavigation';
import { useGameStore } from '@/architecture/game/store';
import { useLuckStore } from '@/architecture/luck/store';
import PrimaryButton from '@/components/PrimaryButton';
import { spring } from '@/design/motion';
import { haptics } from '@/design/haptics';
import { audio } from '@/design/audio';

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase =
  | 'question'
  | 'ball_drop'
  | 'cup_show'
  | 'cup_shuffle'
  | 'cup_pick'
  | 'resolving'
  | 'win'
  | 'lose';

// ── Constants ─────────────────────────────────────────────────────────────────

const SLOT_X = [-115, 0, 115] as const; // px offsets for left / mid / right slots
const CUP_PHASES: Phase[] = ['cup_show', 'cup_shuffle', 'cup_pick', 'resolving', 'win', 'lose'];


// Shuffles: [slotA, slotB, durationMs]
// Slowed down for better visibility and tracking
const SHUFFLE_SEQUENCE: [number, number, number][] = [
  [0, 2, 550], [0, 1, 500], [1, 2, 480],
  [0, 2, 450], [1, 2, 420],
  [0, 1, 400], [0, 2, 380], [1, 2, 360],
  [0, 1, 350],
];

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ── Answer options ────────────────────────────────────────────────────────────

const ANSWERS = [
  { label: 'Could be better',  positive: false, ballColor: ['#D4956A', '#A05A32'] },
  { label: 'It was good!',     positive: true,  ballColor: ['#E8B896', '#C67C4E'] },
  { label: 'Absolutely perfect', positive: true, ballColor: ['#C67C4E', '#6B2D0B'] },
] as const;


// ── Performance tier helper ───────────────────────────────────────────────────

function getPerformanceTier(
  scored: boolean | null,
  positiveRatio: number,
): 'high' | 'mid' | 'low' {
  if (scored === true  && positiveRatio > 0.5) return 'high';
  if (scored === false && positiveRatio <= 0.5) return 'low';
  return 'mid';
}

// ── Client-side fallback (mirrors server win thresholds) ─────────────────────

function clientCupGame(tier: 'high' | 'mid' | 'low', userPick: number): { result: 'win' | 'lose'; ballAt: number } {
  const thresholds = { high: 25, mid: 40, low: 60 };
  const win = Math.random() * 100 < thresholds[tier];
  if (win) return { result: 'win', ballAt: userPick };
  const near = userPick === 1
    ? (Math.random() < 0.5 ? 0 : 2)
    : 1;
  return { result: 'lose', ballAt: near };
}

// ── Ball SVG ─────────────────────────────────────────────────────────────────

function BallSVG({ size = 44, colors }: { size?: number; colors: readonly [string, string] }) {
  const id = `bg-${colors[0].replace('#', '')}`;
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" style={{ display: 'block' }}>
      <defs>
        <radialGradient id={id} cx="35%" cy="28%" r="65%">
          <stop offset="0%"   stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </radialGradient>
      </defs>
      <circle cx="22" cy="22" r="20" fill={`url(#${id})`} />
      <ellipse cx="16" cy="15" rx="5" ry="3.5"
        fill="rgba(255,255,255,0.32)" transform="rotate(-20,16,15)" />
    </svg>
  );
}

// ── Cup SVG — Red Solo Cup (Beer Pong Style) ─────────────────────────────────

function CupSVG({ highlighted, lifted }: { highlighted: boolean; lifted?: boolean }) {
  const cupId = highlighted ? 'redHL' : 'redBase';
  return (
    <svg width="87" height="83" viewBox="0 0 87 83" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        {/* Red plastic gradient */}
        <linearGradient id={cupId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor={highlighted ? '#FF4444' : '#E63946'} />
          <stop offset="50%"  stopColor={highlighted ? '#DC143C' : '#C1121F'} />
          <stop offset="100%" stopColor={highlighted ? '#B22222' : '#9D0208'} />
        </linearGradient>
        
        {/* Shadow filter */}
        <filter id={`shadow-${highlighted ? 'hl' : 'n'}${lifted ? 'l' : ''}`}>
          <feDropShadow dx="0" dy={lifted ? 16 : 7}
            stdDeviation={lifted ? 10 : 6}
            floodColor="rgba(0,0,0,0.3)" />
        </filter>
      </defs>

      {/* Main cup body - tapered trapezoid (15% taller and wider) */}
      <path
        d="M 23,11 L 16,67 L 71,67 L 64,11 Z"
        fill={`url(#${cupId})`}
        filter={`url(#shadow-${highlighted ? 'hl' : 'n'}${lifted ? 'l' : ''})`}
        stroke={highlighted ? '#FF6B6B' : 'rgba(0,0,0,0.15)'}
        strokeWidth={highlighted ? 2 : 1}
      />
      
      {/* Top rim - white ring */}
      <ellipse cx="43.5" cy="11" rx="20.5" ry="4"
        fill="#FFFFFF"
        opacity="0.9"
      />
      
      {/* Middle ring detail (classic solo cup rings) */}
      <path
        d="M 20,32 Q 43.5,30 67,32"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M 19,44 Q 43.5,41 68,44"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="1.5"
        fill="none"
      />
      
      {/* Bottom base */}
      <ellipse cx="43.5" cy="67" rx="27.5" ry="4.5"
        fill={highlighted ? '#9D0208' : '#660708'}
      />
      
      {/* Highlight shine on left side */}
      <path
        d="M 25,17 Q 28,14 30,11 L 30,58 Q 28,55 25,52 Z"
        fill="rgba(255,255,255,0.18)"
        opacity={highlighted ? 1 : 0.7}
      />
      
      {/* Specular highlight */}
      <ellipse cx="32" cy="21" rx="7" ry="11.5"
        fill="rgba(255,255,255,0.25)"
        transform="rotate(-15, 32, 21)"
      />
      
      {/* Inner shadow at top */}
      <ellipse cx="43.5" cy="11" rx="18.5" ry="3"
        fill="rgba(0,0,0,0.2)"
      />
    </svg>
  );
}


// ── Confetti ──────────────────────────────────────────────────────────────────

function Confetti() {
  const COLORS = ['#F59E0B','#FCD34D','#C67C4E','#E8B896','#0D9E6F','#D97706','#6B2D0B'];
  const particles = useRef(
    Array.from({ length: 52 }, (_, i) => ({
      id: i,
      color: COLORS[i % COLORS.length],
      size: 5 + Math.random() * 7,
      tx: (Math.random() - 0.5) * 360,
      ty: -(Math.random() * 230) - 50,
      rot: Math.random() * 720 - 360,
      delay: Math.random() * 0.4,
      circle: Math.random() > 0.5,
    }))
  ).current;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((p) => (
        <motion.div key={p.id}
          className="absolute"
          style={{
            left: '50%', top: '40%',
            width: p.size,
            height: p.circle ? p.size : p.size * 1.6,
            backgroundColor: p.color,
            borderRadius: p.circle ? '50%' : '2px',
          }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0 }}
          animate={{ x: p.tx, y: [p.ty, p.ty + 460], opacity: [1, 1, 0], rotate: p.rot, scale: [0, 1.2, 1, 0.3] }}
          transition={{ duration: 2, delay: p.delay, ease: [0.16, 1, 0.3, 1],
            y: { duration: 2.3, ease: 'easeIn', delay: p.delay },
            opacity: { duration: 2.3, delay: p.delay } }}
        />
      ))}
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ShellGameScreen() {
  const go              = useNavigation((s) => s.go);
  const menuItems       = useGameStore((s) => s.menuItems);
  const addSwipeAnswer  = useGameStore((s) => s.addSwipeAnswer);
  const basketballAnswer = useGameStore((s) => s.basketballAnswer);
  const slingshotAnswers = useGameStore((s) => s.slingshotAnswers);
  const setCupGameLuck  = useLuckStore((s) => s.setCupGameLuck);

  const meal = menuItems[0] || 'your order';
  const positiveRatio = slingshotAnswers.length
    ? slingshotAnswers.filter((a) => a.positive).length / slingshotAnswers.length
    : 0.5;
  const tier = getPerformanceTier(basketballAnswer?.scored ?? null, positiveRatio);

  // ── Core state ──
  const [phase, setPhase]               = useState<Phase>('question');
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hoveredSlot, setHoveredSlot]   = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [gameResult, setGameResult]     = useState<{ result: 'win' | 'lose'; ballAt: number } | null>(null);

  // ── Physics drop state ──
  const [ballPhys, setBallPhys] = useState({ x: 0, y: 0, vy: 0, visible: false, bouncing: false });
  const ballPhysRef = useRef({ x: 0, y: 0, vy: 0, frame: 0, active: false, bouncing: false, bounceCount: 0 });
  const cupPhysY = useMotionValue(300); // Start below the arena
  const cupPhysSpring = useSpring(cupPhysY, { stiffness: 400, damping: 30 });

  // FIX: Initialize spring with immediate: true on first frame to prevent jumping
  useEffect(() => {
    cupPhysY.set(window.innerHeight + 80);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cup motion values ──
  const cup0X = useMotionValue<number>(SLOT_X[0]);
  const cup1X = useMotionValue<number>(SLOT_X[1]);
  const cup2X = useMotionValue<number>(SLOT_X[2]);
  const cup0Y = useMotionValue<number>(0);
  const cup1Y = useMotionValue<number>(0);
  const cup2Y = useMotionValue<number>(0);

  const cupXValues: MotionValue<number>[] = [cup0X, cup1X, cup2X];
  const cupYValues: MotionValue<number>[] = [cup0Y, cup1Y, cup2Y];

  // positions[cupId] = slot (0=left,1=mid,2=right)
  const posRef = useRef<[number, number, number]>([0, 1, 2]);

  // ── Phase transitions ─────────────────────────────────────────────────────

  // cup_show: show ball briefly under center cup, then trigger shuffle
  useEffect(() => {
    if (phase !== 'cup_show') return;
    let alive = true;

    // FIX: Reset ALL motion values to clean state IMMEDIATELY
    // This prevents "ghost" values from previous renders causing visual glitches
    cup0Y.set(0);
    cup1Y.set(0);
    cup2Y.set(0);
    
    // Reset cup positions to their initial slots
    cup0X.set(SLOT_X[0]);
    cup1X.set(SLOT_X[1]);
    cup2X.set(SLOT_X[2]);
    
    // Reset position tracking
    posRef.current = [0, 1, 2];

    (async () => {
      // Ball is already resting on ground, show it for a moment
      await wait(600);
      if (!alive) return;

      // Cups descend slowly from above to cover the ball
      // Start cups high above
      cup0Y.set(-150);
      cup1Y.set(-150);
      cup2Y.set(-150);
      
      // Animate all cups down to ground level simultaneously
      await Promise.all([
        animate(cup0Y, 0, { duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }), // Bounce ease
        animate(cup1Y, 0, { duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }),
        animate(cup2Y, 0, { duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }),
      ]);
      
      if (!alive) return;
      haptics.press();
      audio.tap();

      // Pause to let user see cups have landed
      await wait(500);
      if (!alive) return;

      // Lift center cup to show ball one more time
      await animate(cup1Y, -56, { duration: 0.5, ease: [0.16, 1, 0.3, 1] });
      if (!alive) return;
      haptics.tick();

      // Show ball under cup
      await wait(1000);
      if (!alive) return;

      // Lower center cup to hide ball
      await animate(cup1Y, 0, { duration: 0.4, ease: [0.4, 0, 0.6, 1] });
      if (!alive) return;

      // Pause before shuffle starts
      await wait(600);
      if (!alive) return;
      setPhase('cup_shuffle');
    })();

    return () => { alive = false; };
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // cup_shuffle: run swap sequence then hand to user
  useEffect(() => {
    if (phase !== 'cup_shuffle') return;
    let alive = true;

    (async () => {
      for (const [slotA, slotB, dur] of SHUFFLE_SEQUENCE) {
        if (!alive) break;
        await swapSlots(slotA, slotB, dur);
        // Longer pause between swaps so user can track
        await wait(120);
      }
      if (alive) {
        haptics.bump();
        setPhase('cup_pick');
      }
    })();

    return () => { alive = false; };
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Slot swap helper ─────────────────────────────────────────────────────

  function swapSlots(slotA: number, slotB: number, durationMs: number): Promise<void> {
    return new Promise((resolve) => {
      const pos = [...posRef.current] as [number, number, number];
      const cupAtA = pos.findIndex((v) => v === slotA);
      const cupAtB = pos.findIndex((v) => v === slotB);
      if (cupAtA === -1 || cupAtB === -1) { resolve(); return; }

      pos[cupAtA] = slotB;
      pos[cupAtB] = slotA;
      posRef.current = pos;

      const dur = durationMs / 1000;
      const ease: [number, number, number, number] = [0.16, 1, 0.3, 1];

      Promise.all([
        animate(cupXValues[cupAtA], SLOT_X[slotB], { duration: dur, ease }),
        animate(cupXValues[cupAtB], SLOT_X[slotA], { duration: dur, ease }),
      ]).then(() => resolve());
    });
  }

  // ── User picks a cup ─────────────────────────────────────────────────────

  async function handleCupPick(slot: number) {
    if (phase !== 'cup_pick') return;
    setSelectedSlot(slot);
    setPhase('resolving');
    haptics.press();
    audio.tap();

    let result: { result: 'win' | 'lose'; ballAt: number };

    try {
      const res = await fetch('/api/cup-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, userPick: slot }),
      });
      if (!res.ok) throw new Error();
      result = await res.json();
    } catch {
      result = clientCupGame(tier, slot);
    }

    setGameResult(result);
    await revealResult(slot, result.result, result.ballAt);
  }

  // ── Reveal animation ─────────────────────────────────────────────────────

  async function revealResult(
    pickedSlot: number,
    outcome: 'win' | 'lose',
    ballAt: number,
  ) {
    // Find cup IDs for the picked slot and ball slot
    const pickedCupId = posRef.current.findIndex((v) => v === pickedSlot);
    await wait(400);

    // Lift picked cup slower for dramatic effect
    await animate(cupYValues[pickedCupId], -68, {
      duration: 0.6, ease: [0.16, 1, 0.3, 1],
    });

    if (outcome === 'win') {
      haptics.jackpot();
      audio.bullseye();
      await wait(800);
      setPhase('win');
    } else {
      haptics.miss();
      audio.miss();
      await wait(900);

      // Near-miss: lift the adjacent cup where ball actually is
      const ballCupId = posRef.current.findIndex((v) => v === ballAt);
      await animate(cupYValues[ballCupId], -52, {
        duration: 0.5, ease: [0.16, 1, 0.3, 1],
      });
      haptics.bump();
      await wait(600);
      setPhase('lose');
    }
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleAnswerPick(idx: number) {
    if (phase !== 'question') return;
    setSelectedAnswer(idx);
    haptics.press();
    audio.tap();

    addSwipeAnswer({
      questionId: 'shell_overall',
      question: `How was ${meal}?`,
      positive: ANSWERS[idx].positive,
    });

    setPhase('ball_drop');

    // FIX A: Reset cup position before drop
    cupPhysY.set(window.innerHeight + 80);

    // ── Start physics drop sequence with bounce ──
    const startY = -60; 
    const groundY = window.innerHeight * 0.72; // Ground level
    
    ballPhysRef.current = { x: 0, y: startY, vy: 0, frame: 0, active: true, bouncing: false, bounceCount: 0 };
    setBallPhys({ x: 0, y: startY, vy: 0, visible: true, bouncing: false });
    cupPhysY.set(-200); // Keep cup off-screen during bounce

    const runLoop = () => {
      if (!ballPhysRef.current.active) return;
      
      const p = ballPhysRef.current;
      p.frame++;
      
      // Safety escape
      if (p.frame > 500) {
        p.active = false;
        setPhase('cup_show');
        return;
      }
      
      // Physics constants
      const GRAVITY = 0.28;
      const MAX_VY = 14;
      const WIND_AMPLITUDE = 3.2;
      const WIND_FREQ = 0.045;
      const BOUNCE_DAMPING = 0.55; // Energy loss on bounce (55% retained)
      const MIN_BOUNCE_VY = 1.5; // Minimum velocity to bounce
      const GROUND_THRESHOLD = 3; // How close to ground before settling

      // Apply gravity
      p.vy = Math.min(p.vy + GRAVITY, MAX_VY);
      p.y += p.vy;
      
      // Wind effect (only during fall, not during bounce settle)
      if (!p.bouncing || p.vy > 2) {
        p.x = Math.sin(p.frame * WIND_FREQ) * WIND_AMPLITUDE;
      }
      
      setBallPhys({ x: p.x, y: p.y, vy: p.vy, visible: true, bouncing: p.bouncing });
      
      // Check for ground collision
      if (p.y >= groundY && p.vy > 0) {
        p.bouncing = true;
        p.bounceCount++;
        
        // Bounce if velocity is high enough
        if (Math.abs(p.vy) > MIN_BOUNCE_VY && p.bounceCount <= 2) {
          p.y = groundY; // Snap to ground
          p.vy = -p.vy * BOUNCE_DAMPING; // Reverse and dampen
          haptics.tick(); // Haptic on each bounce
        } else {
          // Ball has settled
          p.y = groundY;
          p.vy = 0;
          p.active = false;
          haptics.press();
          
          // Keep ball visible and settled, then bring cups down
          setTimeout(() => {
            setPhase('cup_show');
          }, 400);
          return;
        }
      }
      
      requestAnimationFrame(runLoop);
    };
    
    requestAnimationFrame(runLoop);
  }

  function handleContinueWin() {
    haptics.press();
    audio.tap();
    setCupGameLuck(true);
    go('spinWheel');
  }

  function handleContinueLose() {
    haptics.press();
    audio.tap();
    setCupGameLuck(false);
    go('spinWheel');
  }

  // ── Derived ──────────────────────────────────────────────────────────────

  const answerColors = selectedAnswer !== null
    ? ANSWERS[selectedAnswer].ballColor
    : ANSWERS[1].ballColor;

  const isCupPhase = (CUP_PHASES as Phase[]).includes(phase);

  // ── Render helpers ────────────────────────────────────────────────────────

  function getCupXForId(id: 0 | 1 | 2) {
    return [cup0X, cup1X, cup2X][id];
  }
  function getCupYForId(id: 0 | 1 | 2) {
    return [cup0Y, cup1Y, cup2Y][id];
  }

  // Ball render position during reveal: SLOT_X[ballAt]
  const ballAtSlot = gameResult?.ballAt ?? 1;
  const ballRevealX = SLOT_X[ballAtSlot];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ScreenShell hideProgress hideBack>
      <style>{`
        @keyframes windLine {
          from { transform: translateX(100vw); }
          to { transform: translateX(-100px); }
        }
      `}</style>
      <div className="flex-1 flex flex-col">

        {/* ─── Phase 1: Question card ─────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {phase === 'question' && (
            <motion.div
              key="question"
              className="flex-1 flex flex-col justify-center px-1 py-8"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40, transition: { duration: 0.28, ease: "easeOut" } }}
              transition={spring.gentle}
            >
              {/* Badge */}
              <motion.div
                className="flex justify-center mb-6"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...spring.snappy, delay: 0.05 }}
              >
                <div
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-caption font-semibold"
                  style={{ background: 'rgba(198,124,78,0.1)', color: '#C67C4E', border: '1px solid rgba(198,124,78,0.18)' }}
                >
                  <span>Quick question</span>
                </div>
              </motion.div>

              {/* Question */}
              <motion.h1
                className="text-heading text-ink text-center mb-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring.gentle, delay: 0.1 }}
              >
                How was {meal}?
              </motion.h1>
              <motion.p
                className="text-body text-ink-secondary text-center mb-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.18 }}
              >
                Pick one — your answer becomes a ball
              </motion.p>

              {/* Answer balls — horizontal row */}
              <div className="flex flex-row items-start justify-center gap-6 px-4 mt-8">
                {ANSWERS.map((answer, idx) => {
                  const isSelected = selectedAnswer === idx;
                  return (
                    <motion.button
                      key={idx}
                      onClick={() => handleAnswerPick(idx)}
                      className="flex flex-col items-center gap-3 flex-1 max-w-[120px]"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...spring.gentle, delay: 0.14 + idx * 0.06 }}
                    >
                      {/* Ball */}
                      <motion.div
                        whileTap={{ scale: 0.88 }}
                        whileHover={{ scale: 1.08 }}
                        className="w-20 h-20 rounded-full"
                        style={{
                          background: `radial-gradient(circle at 35% 28%, ${answer.ballColor[0]}, ${answer.ballColor[1]})`,
                          boxShadow: isSelected
                            ? '0 8px 24px rgba(0,0,0,0.15), inset 0 -4px 8px rgba(0,0,0,0.12), inset 0 4px 8px rgba(255,255,255,0.25), 0 0 0 3px rgba(198,124,78,0.5)'
                            : '0 8px 24px rgba(0,0,0,0.15), inset 0 -4px 8px rgba(0,0,0,0.12), inset 0 4px 8px rgba(255,255,255,0.25)',
                        }}
                      />
                      {/* Label */}
                      <span className="text-center text-sm font-medium text-ink leading-tight">
                        {answer.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ─── Phase 2: Ball drop ─────────────────────────────────────── */}
          {phase === 'ball_drop' && (
            <motion.div
              key="ball-drop"
              className="flex-1 relative overflow-hidden"
              initial={{ opacity: 1 }}
              exit={{ 
                opacity: 0, 
                transition: { 
                  duration: 0.4, 
                  ease: "easeOut",
                  // FIX: Ensure exit animation completes before unmount
                  delay: 0 
                } 
              }}
            >
              {/* Atmospheric Wind Lines */}
              <div 
                className="absolute left-0 w-12 h-[1.5px] bg-ink/10"
                style={{ 
                  top: '30%', 
                  animation: 'windLine 0.9s linear infinite',
                  opacity: 0.12 
                }} 
              />
              <div 
                className="absolute left-0 w-14 h-[1.5px] bg-white/20"
                style={{ 
                  top: '55%', 
                  animation: 'windLine 1.3s linear infinite',
                  animationDelay: '0.4s',
                  opacity: 0.12 
                }} 
              />

              {/* Ball falling with physics and Ghost Trail */}
              {ballPhys.visible && (
                <>
                  {/* Motion-blur ghosts - only show during fall, not during bounce settle */}
                  {!ballPhys.bouncing && [0.18, 0.12, 0.08, 0.04].map((op, i) => {
                    const ghostIdx = i + 1;
                    const ghostY = ballPhys.y - (ghostIdx * ballPhys.vy * 1.2);
                    return (
                      <div
                        key={`ghost-${i}`}
                        className="absolute left-1/2 pointer-events-none"
                        style={{ 
                          left: `calc(50% + ${ballPhys.x}px)`, 
                          top: ghostY,
                          opacity: op,
                          transform: 'translateX(-50%)'
                        }}
                      >
                        <BallSVG size={52} colors={answerColors} />
                      </div>
                    );
                  })}

                  {/* Primary Ball */}
                  <motion.div
                    className="absolute left-1/2"
                    style={{ 
                      x: `calc(-50% + ${ballPhys.x}px)`, 
                      top: ballPhys.y 
                    }}
                  >
                    <BallSVG size={52} colors={answerColors} />
                  </motion.div>
                </>
              )}
            </motion.div>
          )}

        </AnimatePresence>

        {/* ─── Phases 4 & 5: Cup game ─────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {isCupPhase && (
            <motion.div
              key="cups"
              className="flex-1 flex flex-col justify-between py-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
              {/* Header */}
              <motion.div
                className="text-center px-4"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-caption font-semibold mb-3"
                  style={{ background: 'rgba(198,124,78,0.1)', color: '#C67C4E', border: '1px solid rgba(198,124,78,0.18)' }}
                >
                  <span>Shell Game</span>
                </div>

                <h2 className="text-heading text-ink mb-1">
                  {phase === 'cup_show' && 'Watch the ball…'}
                  {phase === 'cup_shuffle' && 'Keep your eyes on it!'}
                  {phase === 'cup_pick' && 'Which cup hides the ball?'}
                  {phase === 'resolving' && 'Checking…'}
                  {phase === 'win' && 'You found it!'}
                  {phase === 'lose' && 'So close!'}
                </h2>
                <p className="text-body text-ink-secondary">
                  {phase === 'cup_show' && 'The ball goes under the center cup'}
                  {phase === 'cup_shuffle' && 'Follow the cup…'}
                  {phase === 'cup_pick' && 'Tap the cup you think it\'s under'}
                  {phase === 'resolving' && ''}
                  {phase === 'win' && 'Spin Wheel unlocked!'}
                  {phase === 'lose' && 'The ball was right next door'}
                </p>
              </motion.div>

              {/* Cup + ball arena */}
              <div className="relative flex justify-center items-end" style={{ height: 180 }}>

                {/* Ball — visible during cup_show (stays on ground) and win/lose reveal */}
                <AnimatePresence>
                  {phase === 'cup_show' && (
                    <motion.div
                      key="ball-show"
                      className="absolute z-0"
                      style={{ bottom: 20, left: '50%', x: '-50%' }}
                      initial={{ opacity: 1, scale: 1 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={spring.snappy}
                    >
                      <BallSVG size={36} colors={answerColors} />
                    </motion.div>
                  )}

                  {(phase === 'win' || phase === 'lose') && gameResult && (
                    <motion.div
                      key="ball-reveal"
                      className="absolute z-0"
                      style={{
                        bottom: 22,
                        left: `calc(50% + ${ballRevealX}px)`,
                        x: '-50%',
                      }}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ ...spring.snappy, delay: 0.1 }}
                    >
                      <BallSVG size={36} colors={answerColors} />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 3 cups */}
                {([0, 1, 2] as const).map((cupId) => {
                  const isSelected = selectedSlot !== null
                    && posRef.current[cupId] === selectedSlot;
                  const isBallCup = gameResult !== null
                    && posRef.current[cupId] === gameResult.ballAt;
                  const isPickable = phase === 'cup_pick';
                  const slot = posRef.current[cupId];
                  const isHovered = hoveredSlot === slot && isPickable;

                  return (
                    <motion.div
                      key={cupId}
                      className="absolute z-10"
                      style={{
                        x: getCupXForId(cupId),
                        y: getCupYForId(cupId),
                        bottom: 10,
                        left: '50%',
                        marginLeft: -38,
                        cursor: isPickable ? 'pointer' : 'default',
                      }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.05 + cupId * 0.08 }}
                      onHoverStart={() => isPickable && setHoveredSlot(slot)}
                      onHoverEnd={() => setHoveredSlot(null)}
                      onClick={() => isPickable && handleCupPick(slot)}
                      whileTap={isPickable ? { scale: 0.93 } : {}}
                    >
                      {/* Selection ring */}
                      <AnimatePresence>
                        {isHovered && (
                          <motion.div
                            className="absolute inset-0 rounded-2xl pointer-events-none"
                            style={{ boxShadow: '0 0 0 3px rgba(198,124,78,0.5)', borderRadius: 12 }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          />
                        )}
                      </AnimatePresence>

                      {/* Win glow */}
                      <AnimatePresence>
                        {phase === 'win' && isSelected && (
                          <motion.div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                              background: 'radial-gradient(ellipse at 50% 50%, rgba(198,124,78,0.35) 0%, transparent 70%)',
                              borderRadius: 12,
                            }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 1, 0.7, 1] }}
                            transition={{ duration: 0.8, repeat: Infinity, repeatType: 'reverse' }}
                          />
                        )}
                        {phase === 'lose' && isBallCup && (
                          <motion.div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                              background: 'radial-gradient(ellipse at 50% 50%, rgba(229,62,62,0.15) 0%, transparent 70%)',
                              borderRadius: 12,
                            }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                          />
                        )}
                      </AnimatePresence>

                      <CupSVG
                        highlighted={isHovered || (phase === 'win' && isSelected)}
                        lifted={phase !== 'cup_show'}
                      />

                      {/* Resolving spinner on picked cup */}
                      {phase === 'resolving' && isSelected && (
                        <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-0.5">
                          {[0, 0.12, 0.24].map((d, i) => (
                            <motion.span
                              key={i}
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ background: '#C67C4E' }}
                              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                              transition={{ duration: 0.6, repeat: Infinity, delay: d }}
                            />
                          ))}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* ─ Result cards ─ */}
              <div className="px-4">
                <AnimatePresence mode="wait">

                  {/* Pick prompt */}
                  {phase === 'cup_pick' && (
                    <motion.p
                      key="pick-hint"
                      className="text-center text-caption text-ink-tertiary"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      Tap a cup
                    </motion.p>
                  )}

                  {/* WIN card */}
                  {phase === 'win' && (
                    <motion.div
                      key="win-card"
                      className="rounded-3xl overflow-hidden"
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid rgba(198,124,78,0.25)',
                        boxShadow: '0 4px 24px rgba(198,124,78,0.22), 0 8px 32px rgba(0,0,0,0.06)',
                      }}
                      initial={{ opacity: 0, y: 30, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={spring.gentle}
                    >
                      {/* Coffee bar accent */}
                      <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, transparent, #C67C4E, transparent)' }} />

                      <div className="px-6 pt-5 pb-6 text-center">
                        <motion.div
                          className="text-5xl mb-3"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ ...spring.snappy, delay: 0.15 }}
                        >
                          🎰
                        </motion.div>
                        <h3 className="text-heading text-ink mb-1">Spin Wheel Unlocked!</h3>
                        <p className="text-body text-ink-secondary mb-5">
                          Your prize is waiting. Spin to reveal it.
                        </p>
                        <PrimaryButton onClick={handleContinueWin}>
                          Spin Now
                        </PrimaryButton>
                      </div>
                    </motion.div>
                  )}

                  {/* LOSE card */}
                  {phase === 'lose' && (
                    <motion.div
                      key="lose-card"
                      className="rounded-3xl overflow-hidden"
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid rgba(200,170,140,0.2)',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                      }}
                      initial={{ opacity: 0, y: 30, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={spring.gentle}
                    >
                      <div className="px-6 pt-5 pb-6 text-center">
                        <motion.div
                          className="text-5xl mb-3"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ ...spring.snappy, delay: 0.15 }}
                        >
                          😮
                        </motion.div>
                        <h3 className="text-heading text-ink mb-1">Almost!</h3>
                        <p className="text-body text-ink-secondary mb-5">
                          The ball was right next door. Better luck next time!
                        </p>
                        <PrimaryButton variant="secondary" onClick={handleContinueLose}>
                          Continue to Review
                        </PrimaryButton>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Confetti on win */}
        {phase === 'win' && <Confetti />}

      </div>
    </ScreenShell>
  );
}
