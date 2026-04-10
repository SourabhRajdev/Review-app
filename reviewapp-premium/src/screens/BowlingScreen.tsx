// BOWLING SCREEN — Experience Rating + Engagement Game
//
// Two-phase single screen:
//   Phase 1 ("choose"): "How was the overall visit?" — user picks answer.
//   Phase 2 ("play"): Power bar oscillates. Tap to roll at the right power.
//     Pin count → luck meter. Choice → review data.
//
// Interaction: ONE TAP. Power bar bounces, tap at the sweet spot.
// No swiping, no dragging. Immediately obvious.

import { useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChoiceStore } from '@/architecture/choice/store';
import type { ExperienceOpinion } from '@/architecture/choice/types';
import { useEngagementStore } from '@/architecture/engagement/store';
import { useRewardStore } from '@/architecture/reward/store';
import type { BowlingTelemetry } from '@/architecture/engagement/types';
import { useNavigation } from './useNavigation';
import { spring, tapScale } from '@/design/motion';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';

// ───────────────────────── Options ─────────────────────────
const EXP_OPTIONS: {
  id: ExperienceOpinion;
  label: string;
  emoji: string;
  sub: string;
}[] = [
  {
    id: 'smooth',
    label: 'Smooth experience',
    emoji: '✨',
    sub: 'The vibe, the service — all great'
  },
  {
    id: 'okay',
    label: 'It was okay',
    emoji: '🤷',
    sub: 'Nothing special, nothing bad'
  },
  {
    id: 'could_be_better',
    label: 'Could be better',
    emoji: '😕',
    sub: 'Room for improvement'
  }
];

// ───────────────────────── Canvas constants ─────────────────────────
const W = 360;
const H = 480;
const LANE_L = 80;
const LANE_R = W - 80;
const BALL_START_Y = H - 70;
const BALL_R = 14;

// Power bar dimensions (right side)
const BAR_X = LANE_R + 24;
const BAR_W = 20;
const BAR_TOP = 60;
const BAR_H = H - 160;
const SWEET_SPOT = 0.75; // optimal power level

// ───────────────────────── Pin layout ─────────────────────────
interface Pin {
  x: number;
  y: number;
  down: boolean;
  fallAngle: number;
  fallDir: number;
}

function freshPins(): Pin[] {
  const pins: Pin[] = [];
  const baseY = 70;
  const s = 26;
  const cx = (LANE_L + LANE_R) / 2;
  const layout = [[0], [-1, 1], [-2, 0, 2], [-3, -1, 1, 3]];
  layout.forEach((row, r) => {
    row.forEach((c) => {
      pins.push({
        x: cx + c * (s / 2),
        y: baseY + r * s,
        down: false,
        fallAngle: 0,
        fallDir: (Math.random() - 0.5) > 0 ? 1 : -1
      });
    });
  });
  return pins;
}

// ───────────────────────── Drawing helpers ─────────────────────────
function drawLane(ctx: CanvasRenderingContext2D) {
  // Floor
  ctx.fillStyle = '#F2F2F7';
  ctx.fillRect(0, 0, W, H);

  // Lane surface
  const laneGrad = ctx.createLinearGradient(LANE_L, 0, LANE_R, 0);
  laneGrad.addColorStop(0, '#F0EDE5');
  laneGrad.addColorStop(0.5, '#F7F4ED');
  laneGrad.addColorStop(1, '#F0EDE5');
  ctx.fillStyle = laneGrad;
  ctx.fillRect(LANE_L, 0, LANE_R - LANE_L, H);

  // Gutters
  ctx.fillStyle = '#E0DDD5';
  ctx.fillRect(LANE_L - 12, 0, 12, H);
  ctx.fillRect(LANE_R, 0, 12, H);

  // Lane arrows (approach markers)
  const arrowY = H - 180;
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  const cx = (LANE_L + LANE_R) / 2;
  [-40, -20, 0, 20, 40].forEach((dx) => {
    ctx.beginPath();
    ctx.moveTo(cx + dx, arrowY);
    ctx.lineTo(cx + dx - 4, arrowY + 10);
    ctx.lineTo(cx + dx + 4, arrowY + 10);
    ctx.closePath();
    ctx.fill();
  });

  // Foul line
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(LANE_L, H - 120);
  ctx.lineTo(LANE_R, H - 120);
  ctx.stroke();
}

function drawPin(
  ctx: CanvasRenderingContext2D,
  p: Pin
) {
  ctx.save();
  ctx.translate(p.x, p.y);

  if (p.down) {
    ctx.rotate(p.fallAngle);
    ctx.globalAlpha = Math.max(0, 1 - Math.abs(p.fallAngle) / 2.5);
  }

  // Pin body
  ctx.fillStyle = '#FAFAFA';
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#D2D2D7';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Red stripe
  ctx.fillStyle = '#FF453A';
  ctx.fillRect(-9, -1.5, 18, 3);

  ctx.restore();
}

function drawBall(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number
) {
  const grad = ctx.createRadialGradient(x - 3, y - 3, 2, x, y, BALL_R);
  grad.addColorStop(0, '#5E5E63');
  grad.addColorStop(1, '#1C1C1E');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, BALL_R, 0, Math.PI * 2);
  ctx.fill();

  // Finger holes
  ctx.fillStyle = '#0A0A0A';
  [[-4, -4], [3, -4], [0, -8]].forEach(([dx, dy]) => {
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, 2.5, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawPowerBar(
  ctx: CanvasRenderingContext2D,
  power: number,
  locked: boolean
) {
  // Bar background
  ctx.fillStyle = '#E8E8ED';
  ctx.beginPath();
  ctx.roundRect(BAR_X, BAR_TOP, BAR_W, BAR_H, 10);
  ctx.fill();

  // Sweet spot indicator
  const sweetY = BAR_TOP + BAR_H * (1 - SWEET_SPOT);
  ctx.fillStyle = 'rgba(50,215,75,0.2)';
  ctx.fillRect(BAR_X, sweetY - 14, BAR_W, 28);
  ctx.strokeStyle = '#32D74B';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(BAR_X, sweetY);
  ctx.lineTo(BAR_X + BAR_W, sweetY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Filled portion
  const fillH = BAR_H * power;
  const fillY = BAR_TOP + BAR_H - fillH;

  const fillColor =
    Math.abs(power - SWEET_SPOT) < 0.12
      ? '#32D74B'
      : Math.abs(power - SWEET_SPOT) < 0.25
      ? '#FFD60A'
      : '#FF453A';

  ctx.fillStyle = fillColor;
  ctx.beginPath();
  ctx.roundRect(BAR_X, fillY, BAR_W, fillH, [0, 0, 10, 10]);
  ctx.fill();

  // Marker line at current power
  if (!locked) {
    ctx.fillStyle = locked ? fillColor : '#0A0A0A';
    ctx.beginPath();
    ctx.moveTo(BAR_X - 6, fillY);
    ctx.lineTo(BAR_X, fillY - 4);
    ctx.lineTo(BAR_X, fillY + 4);
    ctx.closePath();
    ctx.fill();
  }
}

// ───────────────────────── Main Screen ─────────────────────────
export default function BowlingScreen() {
  const go = useNavigation((s) => s.go);
  const setExperienceOpinion = useChoiceStore((s) => s.setExperienceOpinion);
  const commitBowling = useEngagementStore((s) => s.commitBowling);
  const computeFromBowling = useRewardStore((s) => s.computeFromBowling);

  const [phase, setPhase] = useState<'choose' | 'play'>('choose');
  const [chosenLabel, setChosenLabel] = useState('');
  const [resultText, setResultText] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rolledRef = useRef(false);
  const startTimeRef = useRef(0);
  const rafRef = useRef(0);

  // Game refs
  const powerRef = useRef(0);
  const ballRef = useRef({ x: (LANE_L + LANE_R) / 2, y: BALL_START_Y, vy: 0 });
  const pinsRef = useRef(freshPins());
  const hitRef = useRef(false);

  // ── Phase 1: Choice ──
  function handleChoice(id: ExperienceOpinion, label: string) {
    setExperienceOpinion(id);
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

      drawLane(ctx);

      // Power bar oscillation
      if (!rolledRef.current) {
        const t = (now - startTimeRef.current) / 1000;
        const raw = (Math.sin(t * 2.4 - Math.PI / 2) + 1) / 2; // 0→1→0
        powerRef.current = raw;
        drawPowerBar(ctx, raw, false);
      } else {
        drawPowerBar(ctx, powerRef.current, true);
      }

      // Ball physics
      const b = ballRef.current;
      if (rolledRef.current) {
        b.y += b.vy;
        b.vy *= 0.994;

        // Hit pins when ball reaches pin zone
        if (!hitRef.current && b.y < 130) {
          hitRef.current = true;

          // Pins knocked = f(power proximity to sweet spot)
          const accuracy = 1 - Math.abs(powerRef.current - SWEET_SPOT) / SWEET_SPOT;
          let target = Math.round(accuracy * 10 + (Math.random() * 2 - 1));
          target = Math.max(0, Math.min(10, target));

          // Knock closest pins to ball's x
          const sorted = [...pinsRef.current].sort(
            (a, c) => Math.abs(a.x - b.x) - Math.abs(c.x - b.x)
          );
          for (let i = 0; i < target; i++) {
            sorted[i].down = true;
          }

          const telemetry: BowlingTelemetry = {
            swipeSpeedPx: powerRef.current * 2000,
            swipeAngleDeg: 0,
            pinsKnocked: target
          };
          commitBowling(telemetry);
          computeFromBowling(telemetry);

          audio.impact();
          haptics.impact();

          const label =
            target === 10
              ? 'Strike! Max luck boost!'
              : target >= 7
              ? `${target} pins — big boost!`
              : target >= 4
              ? `${target} pins — nice roll!`
              : target >= 1
              ? `${target} pin${target > 1 ? 's' : ''}`
              : 'Gutter — your pick still counts!';
          setResultText(label);

          setTimeout(() => go('disappointment'), 2000);
        }

        // Animate pin falls
        pinsRef.current.forEach((p) => {
          if (p.down && Math.abs(p.fallAngle) < 2.0) {
            p.fallAngle += p.fallDir * 0.12;
          }
        });
      }

      // Draw pins
      pinsRef.current.forEach((p) => drawPin(ctx, p));

      // Draw ball
      drawBall(ctx, b.x, b.y);

      rafRef.current = requestAnimationFrame(animate);
    },
    [commitBowling, computeFromBowling, go]
  );

  useEffect(() => {
    if (phase !== 'play') return;
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, animate]);

  // ── Tap to roll ──
  function handleTap() {
    if (phase !== 'play' || rolledRef.current) return;
    rolledRef.current = true;

    const power = powerRef.current;
    const speed = -(4 + power * 14);
    ballRef.current.vy = speed;

    audio.release();
    haptics.press();
  }

  return (
    <div
      className="relative w-full h-[100dvh] bg-[#F2F2F7] overflow-hidden select-none"
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
                How was the overall visit?
              </motion.h2>
              <motion.p
                className="text-ink-muted text-[15px] mb-8 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
              >
                Pick your lane, then tap to roll for luck.
              </motion.p>

              <div className="flex flex-col gap-3">
                {EXP_OPTIONS.map((opt, i) => (
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
                className="text-ink-muted text-[15px] font-medium text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Tap when the power bar hits the green zone!
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
