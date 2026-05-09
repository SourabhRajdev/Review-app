// BASKETBALL OFFER SCREEN
//
// Flow:
//   Phase 1 — Canvas basketball shooting game
//   Phase 2 — Discount reveal celebration with confetti
//   Phase 3 — Missed all fallback
//
// After the user scores a basket, a random discount (1-10%) is revealed.

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  motion, AnimatePresence,
  useMotionValue, useSpring
} from 'framer-motion';
import ScreenShell from './ScreenShell';
import { useNavigation } from './useNavigation';
import { useGameStore } from '@/architecture/game/store';
import { useLuckStore } from '@/architecture/luck/store';
import { spring } from '@/design/motion';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';
import PrimaryButton from '@/components/PrimaryButton';

type Phase = 'game' | 'reward' | 'missed';

// ── Canvas color constants — light warm palette ──
const BACKBOARD_BG = 'rgba(255,248,240,0.9)';   // warm white backboard
const BACKBOARD_BORDER = '#D8C8BB';              // warm border
const RIM_COLOR = '#F59E0B';                     // amber rim (keep)
const RIM_FRONT = '#D97706';
const RIM_DOT = '#F59E0B';
const NET_COLOR = 'rgba(200,170,140,0.6)';       // warm tan net
const NET_CROSS = 'rgba(200,170,140,0.35)';
const TRAIL_COLOR = '198, 124, 78';             // coffee trail
const SHADOW_COLOR = 'rgba(0,0,0,0.15)';
const BALL_FALLBACK = '#F59E0B';
const BALL_FALLBACK_STROKE = '#B45309';
const RIM_ALPHA = 'rgba(198,124,78,0.5)';       // aim line
const SUCCESS_CIRCLE = 'rgba(13,158,111,0.15)';
const SUCCESS_FLASH = '#0D9E6F';
const HINT_COLOR = '#B09080';                    // --color-ink-tertiary
const CANVAS_BG = 'rgba(251,247,244,0.95)';     // warm court bg

// ── CANVAS CONSTANTS ──
const CANVAS_W = 360;
const CANVAS_H = 540;
const HOOP_X = CANVAS_W / 2;
const HOOP_Y = 130;
const BASE_HOOP_WIDTH = 80;
const BALL_RADIUS = 26;
const GRAVITY = 0.25;
const MAX_ATTEMPTS = 3;
const AIM_ASSIST = 0.45;
const MIN_HOOP_WIDTH = BALL_RADIUS * 2 + 8; // 60px — always passable

const SCORING = {
  ATTEMPT_1: 25,
  ATTEMPT_2: 22,
  ATTEMPT_3: 11,
} as const;

// ── CANVAS BASKETBALL GAME ──

function BasketballGame({ onScore, onMissedAll }: { onScore: (attempt: number) => void; onMissedAll: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const scoredRef = useRef(false);
  const attemptsRef = useRef(0);

  // Hoop scaling for difficulty
  const hoopScale = useMotionValue(1);
  const hoopScaleSpring = useSpring(hoopScale, { stiffness: 300, damping: 25 });

  const bx = useRef(CANVAS_W / 2);
  const by = useRef(CANVAS_H - 80);
  const bvx = useRef(0);
  const bvy = useRef(0);
  const launched = useRef(false);

  const dragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const dragCurX = useRef(0);
  const dragCurY = useRef(0);

  const ballImg = useRef<HTMLImageElement | null>(null);
  useEffect(() => {
    const img = new Image();
    img.src = '/basketball/ball.png';
    ballImg.current = img;
  }, []);

  const trail = useRef<{ x: number; y: number }[]>([]);

  const resetBall = useCallback(() => {
    bx.current = CANVAS_W / 2;
    by.current = CANVAS_H - 80;
    bvx.current = 0;
    bvy.current = 0;
    launched.current = false;
    trail.current = [];

    // Scale hoop based on attempts
    if (attemptsRef.current === 1) hoopScale.set(0.8);
    if (attemptsRef.current === 2) hoopScale.set(0.76);
  }, [hoopScale]);

  useEffect(() => {
    let running = true;

    function tick() {
      if (!running) return;

      const canvas = canvasRef.current;
      if (!canvas) { animRef.current = requestAnimationFrame(tick); return; }
      const ctx = canvas.getContext('2d');
      if (!ctx) { animRef.current = requestAnimationFrame(tick); return; }

      // Get current hoop dimensions from spring
      const currentScale = hoopScaleSpring.get();
      const currentHoopWidth = Math.max(BASE_HOOP_WIDTH * currentScale, MIN_HOOP_WIDTH);
      const leftRimX = HOOP_X - currentHoopWidth / 2;
      const rightRimX = HOOP_X + currentHoopWidth / 2;

      // Physics update
      if (launched.current && !scoredRef.current) {
        bvy.current += GRAVITY;

        const maxV = 18;
        bvy.current = Math.max(-maxV, Math.min(maxV, bvy.current));
        bvx.current = Math.max(-maxV, Math.min(maxV, bvx.current));

        const prevY = by.current;
        bx.current += bvx.current;
        by.current += bvy.current;

        if (Math.abs(by.current - HOOP_Y) < BALL_RADIUS + 12) {
          const rimR = BALL_RADIUS + 4;
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
            bvx.current += 0.8;
            audio.tick();
            haptics.tick();
          }
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
            bvx.current -= 0.8;
            audio.tick();
            haptics.tick();
          }
        }

        if (
          prevY <= HOOP_Y + 5 &&
          by.current > HOOP_Y + 5 &&
          bx.current > leftRimX + 4 &&
          bx.current < rightRimX - 4
        ) {
          scoredRef.current = true;
          audio.cheer();
          haptics.jackpot();
          setTimeout(() => onScore(attemptsRef.current), 500);
        }

        if (bx.current < BALL_RADIUS) {
          bx.current = BALL_RADIUS;
          bvx.current = Math.abs(bvx.current) * 0.5;
        }
        if (bx.current > CANVAS_W - BALL_RADIUS) {
          bx.current = CANVAS_W - BALL_RADIUS;
          bvx.current = -Math.abs(bvx.current) * 0.5;
        }

        if (launched.current) {
          trail.current.push({ x: bx.current, y: by.current });
          if (trail.current.length > 12) trail.current.shift();
        }

        if (by.current > CANVAS_H + 50) {
          attemptsRef.current++;
          audio.boo();
          haptics.miss();
          if (attemptsRef.current >= MAX_ATTEMPTS) {
            scoredRef.current = true;
            setTimeout(() => onMissedAll(), 200);
          } else {
            resetBall();
          }
        }
      }

      // ── DRAW ──
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      // Backboard
      const bbScale = Math.max(0.82, currentScale);
      const bbW = 100 * bbScale, bbH = 65 * bbScale;
      ctx.fillStyle = BACKBOARD_BG;
      ctx.beginPath();
      ctx.roundRect(HOOP_X - bbW / 2, HOOP_Y - bbH + 8, bbW, bbH, 8);
      ctx.fill();
      ctx.strokeStyle = BACKBOARD_BORDER;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Back rim
      ctx.strokeStyle = RIM_COLOR;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(HOOP_X, HOOP_Y, currentHoopWidth / 2, 7 * currentScale, 0, Math.PI, Math.PI * 2);
      ctx.stroke();

      // Net
      ctx.strokeStyle = NET_COLOR;
      ctx.lineWidth = 1.2;
      for (let i = 0; i <= 5; i++) {
        const t = i / 5;
        const sx = leftRimX + t * currentHoopWidth;
        const ex = leftRimX + (8 * currentScale) + t * (currentHoopWidth - (16 * currentScale));
        ctx.beginPath();
        ctx.moveTo(sx, HOOP_Y);
        ctx.quadraticCurveTo((sx + ex) / 2, HOOP_Y + (22 * currentScale), ex, HOOP_Y + (35 * currentScale));
        ctx.stroke();
      }
      ctx.strokeStyle = NET_CROSS;
      for (let row = 0; row < 3; row++) {
        const ry = HOOP_Y + (8 * currentScale) + row * (10 * currentScale);
        const shrink = row * (3 * currentScale);
        ctx.beginPath();
        ctx.moveTo(leftRimX + shrink, ry);
        ctx.lineTo(rightRimX - shrink, ry);
        ctx.stroke();
      }

      // Ball trail
      if (launched.current && trail.current.length > 1) {
        for (let i = 0; i < trail.current.length; i++) {
          const t = trail.current[i];
          const alpha = (i / trail.current.length) * 0.2;
          const size = BALL_RADIUS * (0.3 + (i / trail.current.length) * 0.5);
          ctx.fillStyle = `rgba(${TRAIL_COLOR}, ${alpha})`;
          ctx.beginPath();
          ctx.arc(t.x, t.y, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Ball shadow
      if (!scoredRef.current) {
        const shadowY = CANVAS_H - 30;
        const heightRatio = Math.max(0, 1 - (shadowY - by.current) / (CANVAS_H - 100));
        const shadowW = BALL_RADIUS * (0.5 + heightRatio * 0.8);
        ctx.fillStyle = SHADOW_COLOR;
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
        ctx.fillStyle = BALL_FALLBACK;
        ctx.beginPath();
        ctx.arc(bx.current, by.current, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = BALL_FALLBACK_STROKE;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Front rim (drawn on top of ball)
      ctx.strokeStyle = RIM_FRONT;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(HOOP_X, HOOP_Y, currentHoopWidth / 2, 7 * currentScale, 0, 0, Math.PI);
      ctx.stroke();
      ctx.fillStyle = RIM_DOT;
      ctx.beginPath();
      ctx.arc(leftRimX, HOOP_Y, 4 * currentScale, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(rightRimX, HOOP_Y, 4 * currentScale, 0, Math.PI * 2);
      ctx.fill();


      // Aim line
      if (dragging.current && !launched.current) {
        const ddx = dragCurX.current - dragStartX.current;
        const ddy = dragCurY.current - dragStartY.current;
        if (ddy < -10) {
          ctx.strokeStyle = RIM_ALPHA;
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(bx.current, by.current);
          const aimX = bx.current - ddx * 1.5;
          const aimY = by.current + ddy * 1.5;
          ctx.lineTo(aimX, aimY);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Hint text
      if (!launched.current) {
        ctx.fillStyle = HINT_COLOR;
        ctx.font = '500 14px Outfit, system-ui, sans-serif';
        ctx.textAlign = 'center';
        if (attemptsRef.current === 0) {
          ctx.fillText('Swipe the ball up to shoot!', CANVAS_W / 2, CANVAS_H - 16);
        } else {
          ctx.fillText(`Try again! (${attemptsRef.current + 1}/${MAX_ATTEMPTS})`, CANVAS_W / 2, CANVAS_H - 16);
        }

        // Animated arrow above ball
        const arrowY = by.current - 36 + Math.sin(Date.now() / 350) * 5;
        ctx.strokeStyle = RIM_ALPHA;
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
        ctx.fillStyle = SUCCESS_CIRCLE;
        ctx.beginPath();
        ctx.arc(HOOP_X, HOOP_Y, 50, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = SUCCESS_FLASH;
        ctx.font = 'bold 28px Outfit, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SCORE!', HOOP_X, HOOP_Y + 80);
      }

      animRef.current = requestAnimationFrame(tick);
    }

    tick();
    return () => { running = false; cancelAnimationFrame(animRef.current); };
  }, [onScore, onMissedAll, resetBall]);

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
      audio.tick();
      haptics.tick();
    }
  };

  const lastDragHapticAt = useRef(0);
  const onMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!dragging.current) return;
    e.preventDefault();
    const pos = getPos(e);
    dragCurX.current = pos.x;
    dragCurY.current = pos.y;
    const now = performance.now();
    if (now - lastDragHapticAt.current > 90) {
      lastDragHapticAt.current = now;
      haptics.drag();
    }
  };

  const onUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (launched.current || scoredRef.current) return;

    const dx = dragCurX.current - dragStartX.current;
    const dy = dragCurY.current - dragStartY.current;

    if (dy < -15) {
      launched.current = true;

      const distY = by.current - HOOP_Y;
      const distX = HOOP_X - bx.current;
      const swipeLen = Math.sqrt(dx * dx + dy * dy);
      const power = Math.min(swipeLen / 120, 1);

      const arcHeight = distY + 40 + power * 30;
      const idealVy = -Math.sqrt(2 * GRAVITY * Math.max(arcHeight, 80));
      const flightTime = -2 * idealVy / GRAVITY;
      const idealVx = distX / (flightTime * 0.52);

      const userVx = -dx * 0.12;
      const userVy = Math.max(dy * 0.28, -16);

      bvx.current = userVx * (1 - AIM_ASSIST) + idealVx * AIM_ASSIST;
      bvy.current = userVy * (1 - AIM_ASSIST) + idealVy * AIM_ASSIST;

      bvx.current += (Math.random() - 0.5) * 1.5;
      bvy.current += (Math.random() - 0.5) * 0.8;

      if (bvy.current > -8) bvy.current = -8;

      audio.release();
      haptics.land();
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
        className="rounded-2xl"
        style={{
          touchAction: 'none',
          width: '100%',
          maxWidth: 360,
          background: CANVAS_BG,
          border: '1px solid rgba(200,170,140,0.2)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        }}
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

// ── CONFETTI ──

function Confetti() {
  const CONFETTI_COLORS = ['#F59E0B', '#FCD34D', '#0D9E6F', '#D97706', '#C67C4E', '#F59E0B'];

  const particles = useRef(
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: 50,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 6 + Math.random() * 6,
      angle: Math.random() * 360,
      tx: (Math.random() - 0.5) * 300,
      ty: -(Math.random() * 200) - 50,
      rotation: Math.random() * 720 - 360,
      delay: Math.random() * 0.3,
      shape: Math.random() > 0.5 ? 'circle' : 'rect' as 'circle' | 'rect',
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
            borderRadius: p.shape === 'circle' ? '50%' : '2px',
          }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0 }}
          animate={{
            x: p.tx,
            y: [p.ty, p.ty + 400],
            opacity: [1, 1, 0],
            rotate: p.rotation,
            scale: [0, 1.2, 1, 0.5],
          }}
          transition={{
            duration: 1.8,
            delay: p.delay,
            ease: [0.16, 1, 0.3, 1],
            y: { duration: 2, ease: 'easeIn', delay: p.delay },
            opacity: { duration: 2, delay: p.delay },
          }}
        />
      ))}
    </div>
  );
}

// ── LUCKOMETER REVEAL ──

const TIER_CONFIG = {
  cold:  { label: 'COLD',  color: '#7BA7BC', bg: 'rgba(123,167,188,0.1)', border: 'rgba(123,167,188,0.25)' },
  warm:  { label: 'WARM',  color: '#C67C4E', bg: 'rgba(198,124,78,0.1)',  border: 'rgba(198,124,78,0.25)' },
  hot:   { label: 'HOT',   color: '#E8612A', bg: 'rgba(232,97,42,0.1)',   border: 'rgba(232,97,42,0.25)' },
  fire:  { label: 'FIRE',  color: '#DC2626', bg: 'rgba(220,38,38,0.1)',   border: 'rgba(220,38,38,0.25)' },
};

function LuckometerReveal({ points, onContinue }: { points: number; onContinue: () => void }) {
  const totalLuck = useLuckStore((s) => s.totalLuck);
  const tier = useLuckStore((s) => s.tier);
  const tc = TIER_CONFIG[tier];
  const scored = points > 0;

  return (
    <>
      {scored && <Confetti />}
      <motion.div
        className="flex flex-col items-center text-center"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={spring.gentle}
      >
        {/* Ball icon */}
        <motion.div
          className="relative w-24 h-24 mb-4 flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ ...spring.gentle, delay: 0.15 }}
        >
          <img src="/basketball/ball.png" alt="" className={`w-20 h-20 ${!scored ? 'opacity-40' : ''}`} />
        </motion.div>

        <h2 className="text-heading text-ink mb-1">
          {scored ? 'Nice shot!' : 'Better luck next time!'}
        </h2>
        <p className="text-body text-ink-secondary mb-6">
          {scored ? `You scored +${points} luck points` : 'No luck points this round'}
        </p>

        {/* Points card */}
        <motion.div
          className="w-full max-w-[300px] rounded-3xl p-6 mb-5 relative overflow-hidden"
          initial={{ opacity: 0, y: 30, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ ...spring.gentle, delay: 0.45 }}
          style={{
            background: '#FFFFFF',
            border: `1px solid ${tc.border}`,
            boxShadow: `0 4px 24px ${tc.bg}, 0 8px 32px rgba(0,0,0,0.05)`,
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-0.5"
            style={{ background: `linear-gradient(90deg, transparent, ${tc.color}, transparent)` }} />

          <p className="text-ink-tertiary text-body-sm font-medium mb-1">Luck earned</p>
          <motion.p
            className="font-black leading-none"
            style={{
              fontSize: '3.5rem',
              background: scored
                ? `linear-gradient(135deg, ${tc.color}, #6B2D0B)`
                : 'linear-gradient(135deg, #B09080, #7A5C4A)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.25, 1] }}
            transition={{ delay: 0.65, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            {scored ? `+${points}` : '+0'}
          </motion.p>

          {/* Luckometer bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-caption text-ink-tertiary font-medium">Total luck</span>
              <span className="text-caption font-bold" style={{ color: tc.color }}>{totalLuck}/100</span>
            </div>
            <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(200,170,140,0.18)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${tc.color}88, ${tc.color})` }}
                initial={{ width: 0 }}
                animate={{ width: `${totalLuck}%` }}
                transition={{ delay: 0.8, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            <motion.div
              className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-caption font-bold"
              style={{ background: tc.bg, color: tc.color, border: `1px solid ${tc.border}` }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.0, ...spring.snappy }}
            >
              <span>{tc.label}</span>
            </motion.div>
          </div>
        </motion.div>

        <motion.p
          className="text-caption text-ink-tertiary mb-6 max-w-[280px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
        >
          Your luck meter affects your spin wheel prizes
        </motion.p>

        <motion.div
          className="w-full max-w-[300px]"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.25 }}
        >
          <PrimaryButton onClick={onContinue}>
            Continue
          </PrimaryButton>
        </motion.div>
      </motion.div>
    </>
  );
}

// ── MAIN SCREEN ──

export default function BasketballScreen() {
  const go = useNavigation((s) => s.go);
  const setBasketballAnswer = useGameStore((s) => s.setBasketballAnswer);
  const setBasketballLuck = useLuckStore((s) => s.setBasketballLuck);
  const mode = useGameStore((s) => s.mode);
  const [phase, setPhase] = useState<Phase>('game');
  const [points, setPoints] = useState(0);

  function handleScore(attempt: number) {
    let earned = 0;
    if (attempt === 0) earned = SCORING.ATTEMPT_1;
    else if (attempt === 1) earned = SCORING.ATTEMPT_2;
    else earned = SCORING.ATTEMPT_3;

    setPoints(earned);
    setBasketballAnswer({
      questionId: 'recommend_reward',
      question: 'Bonus Reward',
      selectedOption: 'played',
      scored: true,
      discount: 0,
    });
    setBasketballLuck(earned);
    haptics.impact();
    setTimeout(() => setPhase('reward'), 600);
  }

  function handleMissedAll() {
    setPoints(0);
    setBasketballAnswer({
      questionId: 'recommend_reward',
      question: 'Bonus Reward',
      selectedOption: 'played',
      scored: false,
      discount: 0,
    });
    setBasketballLuck(0);
    setTimeout(() => setPhase('reward'), 400);
  }

  function handleContinue() {
    audio.tap();
    haptics.press();
    go(mode === 'hard' ? 'generating' : 'vibeGame');
  }

  return (
    <ScreenShell className="justify-center">
      <AnimatePresence mode="wait">
        {/* GAME */}
        {phase === 'game' && (
          <motion.div
            key="game"
            className="flex-1 flex flex-col justify-center items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="text-center mb-6"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={spring.gentle}
            >
              <div
                className="text-primary px-3 py-1 rounded-full text-label font-bold inline-block mb-3"
                style={{ background: 'rgba(198,124,78,0.1)', border: '1px solid rgba(198,124,78,0.2)' }}
              >
                BONUS ROUND
              </div>
              <h2 className="text-heading text-ink mb-1">
                Score &amp; Earn Luck!
              </h2>
              <p className="text-ink-secondary text-body">
                Sink the basket to boost your luck meter
              </p>
            </motion.div>

            <BasketballGame onScore={handleScore} onMissedAll={handleMissedAll} />
          </motion.div>
        )}

        {/* REWARD / MISSED — unified luckometer reveal */}
        {phase === 'reward' && (
          <motion.div
            key="reward"
            className="flex-1 flex flex-col justify-center items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <LuckometerReveal points={points} onContinue={handleContinue} />
          </motion.div>
        )}
      </AnimatePresence>
    </ScreenShell>
  );
}
