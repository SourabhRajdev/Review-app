// BASKETBALL OFFER SCREEN
//
// Flow:
//   Phase 1 — "Score & Win!" intro + question with 4 option boards
//   Phase 2 — Canvas basketball shooting game (inspired by BonbonLemon/basketball)
//   Phase 3 — Discount reveal celebration with confetti
//
// After the user scores a basket, a random discount (1-10%) is revealed.

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ScreenShell from './ScreenShell';
import { useNavigation } from './useNavigation';
import { spring, tapScale, staggerContainer, staggerItem } from '@/design/motion';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';

// --- CONFIG ---

const QUESTION = 'Would you recommend us to a friend?';

const OPTIONS = [
  { id: 'absolutely', label: 'Absolutely!', color: '#4CAF50' },
  { id: 'probably', label: 'Most likely', color: '#C67C4E' },
  { id: 'maybe', label: 'Maybe', color: '#F59E0B' },
  { id: 'not_sure', label: 'Not sure yet', color: '#A78BFA' }
];

type Phase = 'question' | 'game' | 'reward' | 'missed';

// --- CANVAS CONSTANTS ---

const CANVAS_W = 360;
const CANVAS_H = 540;
const HOOP_X = CANVAS_W / 2;
const HOOP_Y = 130;
const HOOP_WIDTH = 80;
const BALL_RADIUS = 26;
const GRAVITY = 0.25;
const MAX_ATTEMPTS = 5; // auto-score after this many misses
const AIM_ASSIST = 0.45; // blend factor toward ideal trajectory (0 = none, 1 = auto-aim)

// --- OPTION CARD ---

function OptionCard({
  opt,
  onPick
}: {
  opt: typeof OPTIONS[0];
  onPick: (id: string) => void;
}) {
  return (
    <motion.button
      className="glass-card shadow-card rounded-2xl p-4 cursor-pointer hover:shadow-card-warm transition-shadow duration-200 flex flex-col items-center gap-2 text-center"
      variants={staggerItem}
      whileTap={tapScale.whileTap}
      onClick={() => onPick(opt.id)}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: `${opt.color}15` }}
      >
        <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
          <rect x="14" y="6" width="20" height="14" rx="2" fill={opt.color} opacity="0.3" />
          <ellipse cx="24" cy="24" rx="8" ry="3" stroke={opt.color} strokeWidth="2.5" fill="none" />
          <path d="M16 24 L20 36 L24 30 L28 36 L32 24" stroke={opt.color} strokeWidth="1.5" fill="none" opacity="0.5" />
        </svg>
      </div>
      <span className="text-[14px] font-semibold text-ink leading-tight">{opt.label}</span>
    </motion.button>
  );
}

// --- CANVAS BASKETBALL GAME ---

function BasketballGame({ onScore, onMissedAll }: { onScore: () => void; onMissedAll: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const scoredRef = useRef(false);
  const attemptsRef = useRef(0);

  // Ball state
  const bx = useRef(CANVAS_W / 2);
  const by = useRef(CANVAS_H - 80);
  const bvx = useRef(0);
  const bvy = useRef(0);
  const launched = useRef(false);

  // Drag state
  const dragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const dragCurX = useRef(0);
  const dragCurY = useRef(0);

  // Load ball image
  const ballImg = useRef<HTMLImageElement | null>(null);
  useEffect(() => {
    const img = new Image();
    img.src = '/basketball/ball.png';
    ballImg.current = img;
  }, []);

  // Trail positions for arc visualization
  const trail = useRef<{ x: number; y: number }[]>([]);

  const resetBall = useCallback(() => {
    bx.current = CANVAS_W / 2;
    by.current = CANVAS_H - 80;
    bvx.current = 0;
    bvy.current = 0;
    launched.current = false;
    trail.current = [];
  }, []);

  // --- GAME LOOP ---
  useEffect(() => {
    let running = true;
    const leftRimX = HOOP_X - HOOP_WIDTH / 2;
    const rightRimX = HOOP_X + HOOP_WIDTH / 2;

    function tick() {
      if (!running) return;

      const canvas = canvasRef.current;
      if (!canvas) { animRef.current = requestAnimationFrame(tick); return; }
      const ctx = canvas.getContext('2d');
      if (!ctx) { animRef.current = requestAnimationFrame(tick); return; }

      // --- PHYSICS UPDATE ---
      if (launched.current && !scoredRef.current) {
        bvy.current += GRAVITY;

        // Cap max velocity so ball can't teleport past hoop
        const maxV = 18;
        bvy.current = Math.max(-maxV, Math.min(maxV, bvy.current));
        bvx.current = Math.max(-maxV, Math.min(maxV, bvx.current));

        const prevY = by.current;
        bx.current += bvx.current;
        by.current += bvy.current;

        // --- Rim collision (only when ball is near hoop height) ---
        if (Math.abs(by.current - HOOP_Y) < BALL_RADIUS + 12) {
          const rimR = BALL_RADIUS + 4;
          // Left rim
          const dlx = bx.current - leftRimX;
          const dly = by.current - HOOP_Y;
          const distL = Math.sqrt(dlx * dlx + dly * dly);
          if (distL < rimR && distL > 0) {
            const nx = dlx / distL;
            const ny = dly / distL;
            bx.current = leftRimX + nx * rimR;
            by.current = HOOP_Y + ny * rimR;
            const dot = bvx.current * nx + bvy.current * ny;
            bvx.current -= 1.6 * dot * nx * 0.5;
            bvy.current -= 1.6 * dot * ny * 0.5;
            // Nudge ball inward (toward hoop center) on rim hits
            bvx.current += 0.8;
          }
          // Right rim
          const drx = bx.current - rightRimX;
          const dry = by.current - HOOP_Y;
          const distR = Math.sqrt(drx * drx + dry * dry);
          if (distR < rimR && distR > 0) {
            const nx = drx / distR;
            const ny = dry / distR;
            bx.current = rightRimX + nx * rimR;
            by.current = HOOP_Y + ny * rimR;
            const dot = bvx.current * nx + bvy.current * ny;
            bvx.current -= 1.6 * dot * nx * 0.5;
            bvy.current -= 1.6 * dot * ny * 0.5;
            // Nudge ball inward
            bvx.current -= 0.8;
          }
        }

        // --- Score detection (swept: ball crossed HOOP_Y going downward, between rims) ---
        if (
          prevY <= HOOP_Y + 5 &&
          by.current > HOOP_Y + 5 &&
          bx.current > leftRimX + 4 &&
          bx.current < rightRimX - 4
        ) {
          scoredRef.current = true;
          haptics.impact();
          setTimeout(() => onScore(), 500);
        }

        // --- Wall bounce ---
        if (bx.current < BALL_RADIUS) {
          bx.current = BALL_RADIUS;
          bvx.current = Math.abs(bvx.current) * 0.5;
        }
        if (bx.current > CANVAS_W - BALL_RADIUS) {
          bx.current = CANVAS_W - BALL_RADIUS;
          bvx.current = -Math.abs(bvx.current) * 0.5;
        }

        // --- Trail tracking ---
        if (launched.current) {
          trail.current.push({ x: bx.current, y: by.current });
          if (trail.current.length > 12) trail.current.shift();
        }

        // --- Ball off screen (miss) ---
        if (by.current > CANVAS_H + 50) {
          attemptsRef.current++;
          // All attempts used — no offer, move on
          if (attemptsRef.current >= MAX_ATTEMPTS) {
            scoredRef.current = true;
            setTimeout(() => onMissedAll(), 200);
          } else {
            resetBall();
          }
        }
      }

      // --- DRAW ---
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      // Backboard
      const bbW = 100, bbH = 65;
      ctx.fillStyle = '#C67C4E18';
      ctx.beginPath();
      ctx.roundRect(HOOP_X - bbW / 2, HOOP_Y - bbH + 8, bbW, bbH, 8);
      ctx.fill();
      ctx.strokeStyle = '#C67C4E33';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Back rim (full ellipse behind ball)
      ctx.strokeStyle = '#E8A87C';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(HOOP_X, HOOP_Y, HOOP_WIDTH / 2, 7, 0, Math.PI, Math.PI * 2);
      ctx.stroke();

      // Net
      ctx.strokeStyle = '#D4C4B088';
      ctx.lineWidth = 1.2;
      for (let i = 0; i <= 5; i++) {
        const t = i / 5;
        const sx = leftRimX + t * HOOP_WIDTH;
        const ex = leftRimX + 8 + t * (HOOP_WIDTH - 16);
        ctx.beginPath();
        ctx.moveTo(sx, HOOP_Y);
        ctx.quadraticCurveTo((sx + ex) / 2, HOOP_Y + 22, ex, HOOP_Y + 35);
        ctx.stroke();
      }
      // Cross-hatch
      for (let row = 0; row < 3; row++) {
        const ry = HOOP_Y + 8 + row * 10;
        const shrink = row * 3;
        ctx.beginPath();
        ctx.moveTo(leftRimX + shrink, ry);
        ctx.lineTo(rightRimX - shrink, ry);
        ctx.stroke();
      }

      // Ball trail (fading circles)
      if (launched.current && trail.current.length > 1) {
        for (let i = 0; i < trail.current.length; i++) {
          const t = trail.current[i];
          const alpha = (i / trail.current.length) * 0.25;
          const size = BALL_RADIUS * (0.3 + (i / trail.current.length) * 0.5);
          ctx.fillStyle = `rgba(198, 124, 78, ${alpha})`;
          ctx.beginPath();
          ctx.arc(t.x, t.y, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Ball shadow on ground
      if (!scoredRef.current) {
        const shadowY = CANVAS_H - 30;
        const heightRatio = Math.max(0, 1 - (shadowY - by.current) / (CANVAS_H - 100));
        const shadowW = BALL_RADIUS * (0.5 + heightRatio * 0.8);
        ctx.fillStyle = `rgba(60, 36, 21, ${0.08 + heightRatio * 0.07})`;
        ctx.beginPath();
        ctx.ellipse(bx.current, shadowY, shadowW, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Ball
      const ballDrawn = ballImg.current && ballImg.current.complete;
      if (ballDrawn) {
        const sz = BALL_RADIUS * 2;
        ctx.drawImage(ballImg.current!, bx.current - BALL_RADIUS, by.current - BALL_RADIUS, sz, sz);
      } else {
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.arc(bx.current, by.current, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#92400E';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Front rim (drawn on top of ball)
      ctx.strokeStyle = '#C67C4E';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(HOOP_X, HOOP_Y, HOOP_WIDTH / 2, 7, 0, 0, Math.PI);
      ctx.stroke();
      // Rim dots (the red circles on a real rim)
      ctx.fillStyle = '#C67C4E';
      ctx.beginPath();
      ctx.arc(leftRimX, HOOP_Y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(rightRimX, HOOP_Y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Drag aim line
      if (dragging.current && !launched.current) {
        const ddx = dragCurX.current - dragStartX.current;
        const ddy = dragCurY.current - dragStartY.current;
        if (ddy < -10) {
          ctx.strokeStyle = '#C67C4E55';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(bx.current, by.current);
          // Project aim toward hoop
          const aimX = bx.current - ddx * 1.5;
          const aimY = by.current + ddy * 1.5;
          ctx.lineTo(aimX, aimY);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Hint text
      if (!launched.current) {
        ctx.fillStyle = '#8B7355';
        ctx.font = '500 14px Karla, system-ui, sans-serif';
        ctx.textAlign = 'center';
        if (attemptsRef.current === 0) {
          ctx.fillText('Swipe the ball up to shoot!', CANVAS_W / 2, CANVAS_H - 16);
        } else {
          ctx.fillText(`Try again! (${attemptsRef.current}/${MAX_ATTEMPTS})`, CANVAS_W / 2, CANVAS_H - 16);
        }

        // Animated arrow above ball
        const arrowY = by.current - 36 + Math.sin(Date.now() / 350) * 5;
        ctx.strokeStyle = '#C67C4E77';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(bx.current, arrowY + 14);
        ctx.lineTo(bx.current, arrowY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bx.current - 7, arrowY + 6);
        ctx.lineTo(bx.current, arrowY);
        ctx.lineTo(bx.current + 7, arrowY + 6);
        ctx.stroke();
        ctx.lineCap = 'butt';
      }

      // Score flash
      if (scoredRef.current) {
        ctx.fillStyle = '#4CAF5033';
        ctx.beginPath();
        ctx.arc(HOOP_X, HOOP_Y, 50, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#4CAF50';
        ctx.font = 'bold 28px Karla, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SCORE!', HOOP_X, HOOP_Y + 80);
      }

      animRef.current = requestAnimationFrame(tick);
    }

    tick();
    return () => { running = false; cancelAnimationFrame(animRef.current); };
  }, [onScore, onMissedAll, resetBall]);

  // --- INPUT HANDLING ---
  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const sx = CANVAS_W / rect.width;
    const sy = CANVAS_H / rect.height;
    if ('touches' in e && e.touches.length > 0) {
      return { x: (e.touches[0].clientX - rect.left) * sx, y: (e.touches[0].clientY - rect.top) * sy };
    }
    if ('clientX' in e) {
      return { x: ((e as React.MouseEvent).clientX - rect.left) * sx, y: ((e as React.MouseEvent).clientY - rect.top) * sy };
    }
    return { x: 0, y: 0 };
  };

  const onDown = (e: React.TouchEvent | React.MouseEvent) => {
    if (scoredRef.current || launched.current) return;
    const pos = getPos(e);
    const dist = Math.sqrt((pos.x - bx.current) ** 2 + (pos.y - by.current) ** 2);
    if (dist < BALL_RADIUS + 30) {
      dragging.current = true;
      dragStartX.current = pos.x;
      dragStartY.current = pos.y;
      dragCurX.current = pos.x;
      dragCurY.current = pos.y;
    }
  };

  const onMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!dragging.current) return;
    e.preventDefault();
    const pos = getPos(e);
    dragCurX.current = pos.x;
    dragCurY.current = pos.y;
  };

  const onUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (launched.current || scoredRef.current) return;

    const dx = dragCurX.current - dragStartX.current;
    const dy = dragCurY.current - dragStartY.current;

    // Only shoot on upward swipe
    if (dy < -15) {
      launched.current = true;

      // --- Physics-based launch ---
      // We need the ball to arc up and come back down through the hoop.
      // Calculate the ideal trajectory to reach the hoop, then blend
      // the user's swipe direction with aim-assist.

      const distY = by.current - HOOP_Y; // vertical distance to hoop (positive = hoop is above)
      const distX = HOOP_X - bx.current; // horizontal distance to hoop center

      // Swipe strength (how far they swiped upward)
      const swipeLen = Math.sqrt(dx * dx + dy * dy);
      const power = Math.min(swipeLen / 120, 1); // 0..1 normalized power

      // Ideal vy to reach ~40px above the hoop (nice arc)
      // Using v² = 2*g*h → v = sqrt(2*g*h)
      const arcHeight = distY + 40 + power * 30; // overshoot for arc
      const idealVy = -Math.sqrt(2 * GRAVITY * Math.max(arcHeight, 80));

      // Time to reach hoop height on the way down
      // y = vy*t + 0.5*g*t² → solve for when y = -distY
      // Using the full parabola, time ≈ -2*vy/g (total flight time to same height)
      const flightTime = -2 * idealVy / GRAVITY;
      // Ideal vx to arrive at hoop center in that time
      const idealVx = distX / (flightTime * 0.52); // 0.52 = ball arrives just past apex

      // User's intended direction from swipe
      const userVx = -dx * 0.12;
      const userVy = Math.max(dy * 0.28, -16);

      // Blend user input with aim-assist
      bvx.current = userVx * (1 - AIM_ASSIST) + idealVx * AIM_ASSIST;
      bvy.current = userVy * (1 - AIM_ASSIST) + idealVy * AIM_ASSIST;

      // Add slight randomness so it doesn't feel robotic
      bvx.current += (Math.random() - 0.5) * 1.5;
      bvy.current += (Math.random() - 0.5) * 0.8;

      // Ensure minimum upward speed
      if (bvy.current > -8) bvy.current = -8;

      audio.tap();
      haptics.press();
    }
  };

  return (
    <motion.div
      className="w-full flex justify-center"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={spring.gentle}
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="rounded-2xl bg-white/60 border border-ink-ghost/10 shadow-card"
        style={{ touchAction: 'none', width: '100%', maxWidth: 360 }}
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={onUp}
        onTouchStart={onDown}
        onTouchMove={onMove}
        onTouchEnd={onUp}
      />
    </motion.div>
  );
}

// --- CONFETTI PARTICLES ---

function Confetti() {
  const colors = ['#C67C4E', '#F59E0B', '#4CAF50', '#E8A87C', '#A78BFA', '#F472B6'];
  const particles = useRef(
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: 50 + Math.random() * 0, // starts at center, spread is done via animation
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 6 + Math.random() * 6,
      angle: (Math.random() * 360),
      // Random direction burst
      tx: (Math.random() - 0.5) * 300,
      ty: -(Math.random() * 200) - 50,
      rotation: Math.random() * 720 - 360,
      delay: Math.random() * 0.3,
      shape: Math.random() > 0.5 ? 'circle' : 'rect'
    }))
  ).current;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute"
          style={{
            left: '50%',
            top: '40%',
            width: p.size,
            height: p.shape === 'circle' ? p.size : p.size * 1.6,
            backgroundColor: p.color,
            borderRadius: p.shape === 'circle' ? '50%' : '2px'
          }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0 }}
          animate={{
            x: p.tx,
            y: [p.ty, p.ty + 400],
            opacity: [1, 1, 0],
            rotate: p.rotation,
            scale: [0, 1.2, 1, 0.5]
          }}
          transition={{
            duration: 1.8,
            delay: p.delay,
            ease: [0.16, 1, 0.3, 1],
            y: { duration: 2, ease: 'easeIn', delay: p.delay },
            opacity: { duration: 2, delay: p.delay }
          }}
        />
      ))}
    </div>
  );
}

// --- DISCOUNT REVEAL ---

function DiscountReveal({ discount, onContinue }: { discount: number; onContinue: () => void }) {
  return (
    <>
      <Confetti />
      <motion.div
        className="flex flex-col items-center text-center"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={spring.bouncy}
      >
        {/* Celebration burst */}
        <motion.div
          className="relative w-32 h-32 mb-4"
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {/* Glow ring */}
          <motion.div
            className="absolute inset-[-20px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.25) 0%, transparent 70%)' }}
            animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          {/* Basketball icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ ...spring.bouncy, delay: 0.2 }}
            >
              <img src="/basketball/ball.png" alt="" className="w-20 h-20" />
            </motion.div>
          </div>
        </motion.div>

        <motion.h2
          className="text-[30px] font-bold font-display text-ink mb-2"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Nice shot!
        </motion.h2>

        {/* Discount card */}
        <motion.div
          className="w-full max-w-[300px] rounded-3xl bg-gradient-brand p-7 shadow-glow mb-5 relative overflow-hidden"
          initial={{ opacity: 0, y: 30, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ ...spring.bouncy, delay: 0.5 }}
        >
          {/* Shimmer overlay */}
          <motion.div
            className="absolute inset-0 bg-shimmer bg-[length:200%_100%] opacity-30"
            animate={{ backgroundPosition: ['-200% 0', '200% 0'] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: 'linear' }}
          />
          <p className="text-white/80 text-[15px] font-medium mb-1 relative z-10">You won</p>
          <motion.p
            className="text-white text-[52px] font-bold font-display leading-none relative z-10"
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.3, 1] }}
            transition={{ delay: 0.7, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            {discount}% OFF
          </motion.p>
          <p className="text-white/80 text-[15px] font-medium mt-2 relative z-10">on your next visit</p>
        </motion.div>

        <motion.p
          className="text-ink-muted text-[14px] mb-6 max-w-[280px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          Show this screen to your server to redeem your discount!
        </motion.p>

        <motion.button
          className="w-full max-w-[300px] rounded-2xl bg-gradient-brand px-8 py-[18px] text-[17px] font-semibold text-white shadow-card-warm cursor-pointer"
          whileTap={tapScale.whileTap}
          onClick={onContinue}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
        >
          Continue to Review
        </motion.button>
      </motion.div>
    </>
  );
}

// --- MAIN SCREEN ---

export default function BasketballScreen() {
  const go = useNavigation((s) => s.go);
  const [phase, setPhase] = useState<Phase>('question');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [discount, setDiscount] = useState(0);

  function handlePickOption(id: string) {
    setSelectedOption(id);
    audio.tap();
    haptics.press();
    setTimeout(() => setPhase('game'), 400);
  }

  function handleScore() {
    const randomDiscount = Math.floor(Math.random() * 10) + 1;
    setDiscount(randomDiscount);
    audio.bullseye();
    haptics.impact();
    setTimeout(() => setPhase('reward'), 600);
  }

  function handleMissedAll() {
    setTimeout(() => setPhase('missed'), 400);
  }

  function handleContinue() {
    audio.tap();
    haptics.press();
    go('generating');
  }

  return (
    <ScreenShell className="justify-center">
      <AnimatePresence mode="wait">
        {/* --- PHASE 1: QUESTION --- */}
        {phase === 'question' && (
          <motion.div
            key="question"
            className="flex-1 flex flex-col justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="text-center mb-8"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={spring.gentle}
            >
              <motion.div
                className="w-16 h-16 rounded-2xl bg-accent-amber/10 flex items-center justify-center mx-auto mb-4"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={spring.bouncy}
              >
                <img src="/basketball/ball.png" alt="" className="w-9 h-9" />
              </motion.div>
              <h2 className="text-[26px] font-bold font-display text-ink mb-1">
                Score & Win!
              </h2>
              <p className="text-ink-muted text-[15px]">
                Pick your answer, then sink the basket for a surprise discount
              </p>
            </motion.div>

            <motion.p
              className="text-[18px] font-semibold text-ink text-center mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {QUESTION}
            </motion.p>

            <motion.div
              className="grid grid-cols-2 gap-3 w-full max-w-[360px] mx-auto"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {OPTIONS.map((opt) => (
                <OptionCard key={opt.id} opt={opt} onPick={handlePickOption} />
              ))}
            </motion.div>
          </motion.div>
        )}

        {/* --- PHASE 2: GAME --- */}
        {phase === 'game' && (
          <motion.div
            key="game"
            className="flex-1 flex flex-col justify-center items-center"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
          >
            <motion.p
              className="text-[14px] font-medium text-ink-muted mb-2 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              You picked: <span className="text-brand font-semibold">{OPTIONS.find((o) => o.id === selectedOption)?.label}</span>
            </motion.p>

            <motion.h2
              className="text-[22px] font-bold font-display text-ink mb-3 text-center"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              Sink it for your offer!
            </motion.h2>

            <BasketballGame onScore={handleScore} onMissedAll={handleMissedAll} />
          </motion.div>
        )}

        {/* --- PHASE 3: REWARD --- */}
        {phase === 'reward' && (
          <motion.div
            key="reward"
            className="flex-1 flex flex-col justify-center items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <DiscountReveal discount={discount} onContinue={handleContinue} />
          </motion.div>
        )}

        {/* --- PHASE 4: MISSED ALL --- */}
        {phase === 'missed' && (
          <motion.div
            key="missed"
            className="flex-1 flex flex-col justify-center items-center text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-24 h-24 rounded-full bg-surface-sunken flex items-center justify-center mb-5"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={spring.bouncy}
            >
              <img src="/basketball/ball.png" alt="" className="w-14 h-14 opacity-50" />
            </motion.div>

            <motion.h2
              className="text-[26px] font-bold font-display text-ink mb-2"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Better luck next time!
            </motion.h2>

            <motion.p
              className="text-ink-muted text-[15px] mb-8 max-w-[280px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              No worries — let's finish up your review.
            </motion.p>

            <motion.button
              className="w-full max-w-[300px] rounded-2xl bg-gradient-brand px-8 py-[18px] text-[17px] font-semibold text-white shadow-card-warm cursor-pointer"
              whileTap={tapScale.whileTap}
              onClick={handleContinue}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              Continue to Review
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </ScreenShell>
  );
}
