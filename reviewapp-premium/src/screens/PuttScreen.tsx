// PUTT SCREEN — Return Intent + Engagement Game
//
// Two-phase single screen:
//   Phase 1 ("choose"): "Coming back?" — user picks their intent.
//   Phase 2 ("play"): Aim arrow rotates. Tap to putt when aiming at hole.
//     Accuracy → luck meter. Choice → review data.
//
// Interaction: ONE TAP. Aim arrow oscillates, tap when it points at the hole.
// No dragging, no two-step process. Immediately obvious.

import { useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChoiceStore } from '@/architecture/choice/store';
import type { ReturnIntent } from '@/architecture/choice/types';
import { useEngagementStore } from '@/architecture/engagement/store';
import { useRewardStore } from '@/architecture/reward/store';
import type { PuttTelemetry } from '@/architecture/engagement/types';
import { useNavigation } from './useNavigation';
import { spring, tapScale } from '@/design/motion';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';

// ───────────────────────── Options ─────────────────────────
const RETURN_OPTIONS: {
  id: ReturnIntent;
  label: string;
  emoji: string;
  sub: string;
}[] = [
  {
    id: 'new_regular',
    label: 'My new regular',
    emoji: '🏠',
    sub: 'Definitely coming back'
  },
  {
    id: 'will_return',
    label: 'Will return',
    emoji: '👍',
    sub: 'Worth another visit'
  },
  { id: 'maybe', label: 'Maybe', emoji: '🤔', sub: 'Not sure yet' }
];

// ───────────────────────── Canvas constants ─────────────────────────
const W = 360;
const H = 500;
const HOLE = { x: W / 2, y: 90, r: 14 };
const BALL = { x: W / 2, y: H - 100, r: 10 };
const AIM_LEN = 120;
const SWING_RANGE = 0.7; // radians each side of center (±40°)

// ───────────────────────── Drawing helpers ─────────────────────────
function drawGreen(ctx: CanvasRenderingContext2D) {
  // Grass gradient
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#B8D9A8');
  g.addColorStop(0.4, '#C4DFB6');
  g.addColorStop(1, '#A8CE96');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Subtle grass texture lines
  ctx.strokeStyle = 'rgba(0,0,0,0.025)';
  ctx.lineWidth = 1;
  for (let y = 0; y < H; y += 18) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // Green border/fringe
  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 3;
  ctx.strokeRect(16, 16, W - 32, H - 32);
}

function drawHole(ctx: CanvasRenderingContext2D) {
  // Shadow
  ctx.beginPath();
  ctx.arc(HOLE.x, HOLE.y, HOLE.r + 4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  ctx.fill();

  // Hole
  ctx.beginPath();
  ctx.arc(HOLE.x, HOLE.y, HOLE.r, 0, Math.PI * 2);
  ctx.fillStyle = '#1C1C1E';
  ctx.fill();

  // Inner highlight
  ctx.beginPath();
  ctx.arc(HOLE.x, HOLE.y, HOLE.r - 3, 0, Math.PI * 2);
  ctx.fillStyle = '#2C2C2E';
  ctx.fill();

  // Flag pole
  ctx.fillStyle = '#8E8E93';
  ctx.fillRect(HOLE.x - 1, HOLE.y - 52, 2, 52);

  // Flag
  ctx.fillStyle = '#FF453A';
  ctx.beginPath();
  ctx.moveTo(HOLE.x + 1, HOLE.y - 52);
  ctx.lineTo(HOLE.x + 22, HOLE.y - 44);
  ctx.lineTo(HOLE.x + 1, HOLE.y - 36);
  ctx.closePath();
  ctx.fill();
}

function drawBallAndAim(
  ctx: CanvasRenderingContext2D,
  bx: number,
  by: number,
  aimAngle: number | null,
  putted: boolean
) {
  // Aim line (before putting)
  if (aimAngle !== null && !putted) {
    const endX = bx + Math.sin(aimAngle) * AIM_LEN;
    const endY = by - Math.cos(aimAngle) * AIM_LEN;

    // Dotted aim line
    ctx.save();
    ctx.strokeStyle = 'rgba(10,10,10,0.35)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Arrow head
    ctx.fillStyle = 'rgba(10,10,10,0.5)';
    const headLen = 10;
    const ax = Math.sin(aimAngle);
    const ay = -Math.cos(aimAngle);
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX - ax * headLen + ay * 5, endY - ay * headLen - ax * 5);
    ctx.lineTo(endX - ax * headLen - ay * 5, endY - ay * headLen + ax * 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Ball shadow
  ctx.beginPath();
  ctx.arc(bx + 2, by + 2, BALL.r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  ctx.fill();

  // Ball
  const bg = ctx.createRadialGradient(bx - 2, by - 2, 1, bx, by, BALL.r);
  bg.addColorStop(0, '#FFFFFF');
  bg.addColorStop(1, '#E8E8ED');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(bx, by, BALL.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#D2D2D7';
  ctx.lineWidth = 1;
  ctx.stroke();
}

// ───────────────────────── Main Screen ─────────────────────────
export default function PuttScreen() {
  const go = useNavigation((s) => s.go);
  const setReturnIntent = useChoiceStore((s) => s.setReturnIntent);
  const commitPutt = useEngagementStore((s) => s.commitPutt);
  const computeFromPutt = useRewardStore((s) => s.computeFromPutt);

  const [phase, setPhase] = useState<'choose' | 'play'>('choose');
  const [chosenLabel, setChosenLabel] = useState('');
  const [resultText, setResultText] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const puttedRef = useRef(false);
  const doneRef = useRef(false);
  const startTimeRef = useRef(0);
  const rafRef = useRef(0);

  const ballPosRef = useRef({ x: BALL.x, y: BALL.y, vx: 0, vy: 0 });
  const aimAngleRef = useRef(0);

  // ── Phase 1: Choice ──
  function handleChoice(id: ReturnIntent, label: string) {
    setReturnIntent(id);
    setChosenLabel(label);
    audio.tap();
    haptics.impact();
    setTimeout(() => {
      setPhase('play');
      startTimeRef.current = performance.now();
    }, 500);
  }

  // ── Phase 2: Animation loop ──
  const animate = useCallback(
    (now: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      drawGreen(ctx);
      drawHole(ctx);

      const b = ballPosRef.current;

      if (!puttedRef.current) {
        // Oscillating aim arrow
        const t = (now - startTimeRef.current) / 1000;
        const angle = Math.sin(t * 1.6) * SWING_RANGE;
        aimAngleRef.current = angle;
        drawBallAndAim(ctx, b.x, b.y, angle, false);
      } else if (!doneRef.current) {
        // Ball in motion
        b.x += b.vx;
        b.y += b.vy;
        b.vx *= 0.982;
        b.vy *= 0.982;

        const dHole = Math.hypot(b.x - HOLE.x, b.y - HOLE.y);
        const speed = Math.hypot(b.vx, b.vy);
        const holed = dHole < HOLE.r && speed < 6;
        const stopped = speed < 0.15;
        const oob = b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20;

        if (holed || stopped || oob) {
          doneRef.current = true;

          if (holed) {
            b.x = HOLE.x;
            b.y = HOLE.y;
          }

          const telemetry: PuttTelemetry = {
            pullDistance: 80,
            releaseAngleDeg: aimAngleRef.current * (180 / Math.PI),
            distanceToHole: dHole,
            holed
          };

          commitPutt(telemetry);
          computeFromPutt(telemetry);

          if (holed) {
            audio.bullseye();
            haptics.jackpot();
            setResultText('Hole in one! Max luck!');
          } else if (dHole < 40) {
            audio.impact();
            haptics.bump();
            setResultText('So close! Nice boost');
          } else {
            audio.impact();
            haptics.tick();
            setResultText('Missed — your pick still counts!');
          }

          setTimeout(() => go('comparison'), 1800);
        }

        drawBallAndAim(ctx, b.x, b.y, null, true);
      } else {
        // Ball stopped — draw final position
        drawBallAndAim(ctx, b.x, b.y, null, true);
      }

      rafRef.current = requestAnimationFrame(animate);
    },
    [commitPutt, computeFromPutt, go]
  );

  useEffect(() => {
    if (phase !== 'play') return;
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, animate]);

  // ── Tap to putt ──
  function handleTap() {
    if (phase !== 'play' || puttedRef.current) return;
    puttedRef.current = true;

    const angle = aimAngleRef.current;
    const power = 9; // consistent moderate power
    ballPosRef.current.vx = Math.sin(angle) * power;
    ballPosRef.current.vy = -Math.cos(angle) * power;

    audio.release();
    haptics.press();
  }

  return (
    <div
      className="relative w-full h-[100dvh] bg-[#A8CE96] overflow-hidden select-none"
      style={{ touchAction: 'none' }}
    >
      {/* Canvas */}
      {phase === 'play' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="w-full max-w-[400px]"
            style={{ aspectRatio: `${W}/${H}` }}
            onPointerDown={handleTap}
          />
        </div>
      )}

      {/* ── Phase 1: Choice overlay ── */}
      <AnimatePresence>
        {phase === 'choose' && (
          <motion.div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.4 }}
          >
            <div className="w-full max-w-[340px]">
              <motion.h2
                className="text-[28px] font-bold tracking-tighter text-center text-ink mb-2"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={spring.gentle}
              >
                Coming back?
              </motion.h2>
              <motion.p
                className="text-ink-muted text-[15px] mb-8 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
              >
                Pick your answer, then putt for luck.
              </motion.p>

              <div className="flex flex-col gap-3">
                {RETURN_OPTIONS.map((opt, i) => (
                  <motion.button
                    key={opt.id}
                    className="w-full glass shadow-card rounded-2xl px-6 py-5 text-left"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...spring.snappy, delay: 0.2 + i * 0.08 }}
                    whileTap={tapScale.whileTap}
                    onClick={() => handleChoice(opt.id, opt.label)}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-[28px]">{opt.emoji}</span>
                      <div>
                        <p className="text-[17px] font-semibold text-ink">
                          {opt.label}
                        </p>
                        <p className="text-[13px] text-ink-muted">{opt.sub}</p>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Phase 2: Game HUD ── */}
      {phase === 'play' && (
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between py-10 px-6">
          {/* Top */}
          <div className="flex flex-col items-center gap-3">
            <motion.div
              className="bg-white/90 backdrop-blur-lg rounded-full px-5 py-2 shadow-card"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={spring.bouncy}
            >
              <span className="text-[14px] font-semibold text-ink">
                {chosenLabel}
              </span>
            </motion.div>
            {!resultText && (
              <motion.p
                className="text-ink-muted text-[15px] font-medium text-center bg-white/70 backdrop-blur rounded-full px-4 py-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Tap when the arrow aims at the hole!
              </motion.p>
            )}
          </div>

          {/* Center — result */}
          <AnimatePresence>
            {resultText && (
              <motion.div
                className="bg-white/90 backdrop-blur-lg rounded-3xl px-8 py-4 shadow-glass"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={spring.bouncy}
              >
                <span className="text-[20px] font-bold text-ink">
                  {resultText}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <div />
        </div>
      )}
    </div>
  );
}
