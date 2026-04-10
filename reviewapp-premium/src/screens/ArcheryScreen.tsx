// ARCHERY SCREEN — Food Rating + Engagement Game
//
// Two-phase single screen:
//   Phase 1 ("choose"): "How was the food?" — user taps their answer.
//   Phase 2 ("play"): A crosshair sweeps across the target. Tap to fire.
//     Accuracy → luck meter. Choice → review data.
//
// Interaction: ONE TAP. Crosshair oscillates, user taps at the right moment.
// No dragging, no complex gestures. Immediately obvious.

import { useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChoiceStore } from '@/architecture/choice/store';
import type { ProductOpinion } from '@/architecture/choice/types';
import { useEngagementStore } from '@/architecture/engagement/store';
import { useRewardStore } from '@/architecture/reward/store';
import type { ArcheryTelemetry } from '@/architecture/engagement/types';
import { useNavigation } from './useNavigation';
import { spring, tapScale } from '@/design/motion';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';

// ───────────────────────── Options ─────────────────────────
const FOOD_OPTIONS: { id: ProductOpinion; label: string; emoji: string; sub: string }[] = [
  { id: 'loved', label: 'Loved it', emoji: '🔥', sub: 'Really hit the spot' },
  { id: 'okay', label: 'It was okay', emoji: '👌', sub: 'Nothing special' },
  { id: 'not_great', label: 'Not great', emoji: '😐', sub: 'Room for improvement' }
];

// ───────────────────────── Canvas constants ─────────────────────────
const W = 360;
const H = 400;
const CX = W / 2;
const CY = H / 2;
const RADIUS = 120;

// ───────────────────────── Ring classification ─────────────────────────
function classifyHit(dist: number): {
  ring: ArcheryTelemetry['ring'];
  label: string;
} {
  const n = dist / RADIUS;
  if (n < 0.15) return { ring: 'bullseye', label: 'Bullseye! Max luck boost' };
  if (n < 0.35) return { ring: 'inner', label: 'Great shot! Big boost' };
  if (n < 0.65) return { ring: 'middle', label: 'Nice hit! Luck boost' };
  if (n <= 1.0) return { ring: 'outer', label: 'On the board!' };
  return { ring: 'miss', label: 'Missed — your pick still counts!' };
}

// ───────────────────────── Drawing helpers ─────────────────────────
function drawTarget(ctx: CanvasRenderingContext2D) {
  // Drop shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.10)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 4;
  ctx.beginPath();
  ctx.arc(CX, CY, RADIUS + 8, 0, Math.PI * 2);
  ctx.fillStyle = '#E8E8ED';
  ctx.fill();
  ctx.restore();

  // Rings from outside in — each is a filled circle that covers the previous
  const rings: [number, string][] = [
    [RADIUS, '#F5F5F7'],         // white border ring
    [RADIUS * 0.95, '#FF453A'],  // outer red
    [RADIUS * 0.78, '#FF453A'],  // red
    [RADIUS * 0.66, '#FAFAFA'],  // white
    [RADIUS * 0.54, '#FAFAFA'],  // white
    [RADIUS * 0.42, '#0A84FF'],  // blue
    [RADIUS * 0.30, '#0A84FF'],  // blue
    [RADIUS * 0.15, '#FFD60A'],  // gold bullseye
  ];

  rings.forEach(([r, color]) => {
    ctx.beginPath();
    ctx.arc(CX, CY, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  });

  // Subtle ring separators
  [0.95, 0.66, 0.42, 0.15].forEach((pct) => {
    ctx.beginPath();
    ctx.arc(CX, CY, RADIUS * pct, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    ctx.stroke();
  });
}

function drawCrosshair(ctx: CanvasRenderingContext2D, x: number) {
  ctx.save();

  // Vertical dashed line
  ctx.strokeStyle = 'rgba(10,10,10,0.55)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(x, CY - RADIUS - 24);
  ctx.lineTo(x, CY + RADIUS + 24);
  ctx.stroke();
  ctx.setLineDash([]);

  // Reticle circle
  ctx.strokeStyle = 'rgba(10,10,10,0.7)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(x, CY, 14, 0, Math.PI * 2);
  ctx.stroke();

  // Inner crosshairs
  ctx.strokeStyle = 'rgba(10,10,10,0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - 6, CY);
  ctx.lineTo(x + 6, CY);
  ctx.moveTo(x, CY - 6);
  ctx.lineTo(x, CY + 6);
  ctx.stroke();

  ctx.restore();
}

function drawImpact(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  age: number
) {
  // Radial flash (fades over 0.4s)
  if (age < 0.4) {
    const alpha = (1 - age / 0.4) * 0.5;
    ctx.save();
    ctx.globalAlpha = alpha;
    const g = ctx.createRadialGradient(x, y, 0, x, y, 50);
    g.addColorStop(0, '#FFD60A');
    g.addColorStop(0.6, 'rgba(255,214,10,0.3)');
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Expanding ring (0 → 0.5s)
  if (age < 0.5) {
    const ringR = 10 + age * 60;
    const ringAlpha = 1 - age / 0.5;
    ctx.save();
    ctx.globalAlpha = ringAlpha;
    ctx.strokeStyle = '#FFD60A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, ringR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Dart point
  ctx.fillStyle = '#1C1C1E';
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();

  // Yellow highlight ring
  ctx.strokeStyle = '#FFD60A';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(x, y, 9, 0, Math.PI * 2);
  ctx.stroke();
}

// ───────────────────────── Main Screen ─────────────────────────
export default function ArcheryScreen() {
  const go = useNavigation((s) => s.go);
  const setProductOpinion = useChoiceStore((s) => s.setProductOpinion);
  const commitArchery = useEngagementStore((s) => s.commitArchery);
  const computeFromArchery = useRewardStore((s) => s.computeFromArchery);

  const [phase, setPhase] = useState<'choose' | 'play'>('choose');
  const [chosenLabel, setChosenLabel] = useState('');
  const [resultText, setResultText] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const firedRef = useRef(false);
  const startTimeRef = useRef(0);
  const rafRef = useRef(0);
  const dartRef = useRef<{ x: number; y: number } | null>(null);
  const impactTimeRef = useRef(0);

  // ── Phase 1: Choice ──
  function handleChoice(id: ProductOpinion, label: string) {
    setProductOpinion(id);
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

      // Background
      ctx.fillStyle = '#F2F2F7';
      ctx.fillRect(0, 0, W, H);

      drawTarget(ctx);

      if (!firedRef.current) {
        // Sweeping crosshair
        const t = (now - startTimeRef.current) / 1000;
        const sway = Math.sin(t * 2.0) * (RADIUS - 12);
        drawCrosshair(ctx, CX + sway);
      } else if (dartRef.current) {
        const age = (now - impactTimeRef.current) / 1000;
        drawImpact(ctx, dartRef.current.x, dartRef.current.y, age);
      }

      rafRef.current = requestAnimationFrame(animate);
    },
    []
  );

  useEffect(() => {
    if (phase !== 'play') return;
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, animate]);

  // ── Tap to fire ──
  function handleTap() {
    if (phase !== 'play' || firedRef.current) return;
    firedRef.current = true;
    impactTimeRef.current = performance.now();

    const now = performance.now();
    const t = (now - startTimeRef.current) / 1000;
    const sway = Math.sin(t * 2.0) * (RADIUS - 12);

    // Small scatter for realism
    const sx = (Math.random() - 0.5) * 14;
    const sy = (Math.random() - 0.5) * 22;
    const x = CX + sway + sx;
    const y = CY + sy;
    dartRef.current = { x, y };

    const dist = Math.hypot(x - CX, y - CY);
    const normalized = Math.min(1, dist / RADIUS);
    const { ring, label } = classifyHit(dist);

    const telemetry: ArcheryTelemetry = {
      drawTimeMs: now - startTimeRef.current,
      drawPower: 1,
      hitDistance: normalized,
      ring
    };

    commitArchery(telemetry);
    computeFromArchery(telemetry);

    if (ring === 'bullseye') {
      audio.bullseye();
      haptics.jackpot();
    } else if (ring === 'inner') {
      audio.impact();
      haptics.bump();
    } else {
      audio.impact();
      haptics.tick();
    }

    setResultText(label);
    setTimeout(() => go('sensoryChips'), 1800);
  }

  return (
    <div
      className="relative w-full h-[100dvh] bg-[#F2F2F7] overflow-hidden select-none"
      style={{ touchAction: 'none' }}
    >
      {/* Canvas — visible during play phase */}
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
                How was the food?
              </motion.h2>
              <motion.p
                className="text-ink-muted text-[15px] mb-8 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
              >
                Pick your answer, then aim for the bullseye.
              </motion.p>

              <div className="flex flex-col gap-3">
                {FOOD_OPTIONS.map((opt, i) => (
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
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between py-12 px-6">
          {/* Top — badge + instruction */}
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
                Tap when the crosshair lines up!
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
