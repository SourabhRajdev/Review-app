// ARCHERY SCREEN — Reward Only (Legacy Migration)
//
// After Round 1, present this optional game for a reward.
// User aims for the bullseye to get a better reward boost.
// Linear flow: Round 1 → Archery (optional) → Round 2

import { useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEngagementStore } from '@/architecture/engagement/store';
import { useRewardStore } from '@/architecture/reward/store';
import type { ArcheryTelemetry } from '@/architecture/engagement/types';
import { useNavigation } from './useNavigation';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';

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
  return { ring: 'miss', label: 'Missed!' };
}

// ───────────────────────── Drawing helpers ─────────────────────────
function drawTarget(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.10)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 4;
  ctx.beginPath();
  ctx.arc(CX, CY, RADIUS + 8, 0, Math.PI * 2);
  ctx.fillStyle = '#E8E8ED';
  ctx.fill();
  ctx.restore();

  const rings: [number, string][] = [
    [RADIUS, '#F5F5F7'],
    [RADIUS * 0.95, '#FF453A'],
    [RADIUS * 0.78, '#FF453A'],
    [RADIUS * 0.66, '#FAFAFA'],
    [RADIUS * 0.54, '#FAFAFA'],
    [RADIUS * 0.42, '#0A84FF'],
    [RADIUS * 0.30, '#0A84FF'],
    [RADIUS * 0.15, '#FFD60A'],
  ];

  rings.forEach(([r, color]) => {
    ctx.beginPath();
    ctx.arc(CX, CY, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  });

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
  ctx.strokeStyle = 'rgba(10,10,10,0.55)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(x, CY - RADIUS - 24);
  ctx.lineTo(x, CY + RADIUS + 24);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(10,10,10,0.7)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(x, CY, 14, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawImpact(ctx: CanvasRenderingContext2D, x: number, y: number, age: number) {
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
  ctx.fillStyle = '#1C1C1E';
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();
}

export default function ArcheryScreen() {
  const go = useNavigation((s) => s.go);
  const commitArchery = useEngagementStore((s) => s.commitArchery);
  const computeFromArchery = useRewardStore((s) => s.computeFromArchery);

  const [resultText, setResultText] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const firedRef = useRef(false);
  const startTimeRef = useRef(performance.now());
  const rafRef = useRef(0);
  const dartRef = useRef<{ x: number; y: number } | null>(null);
  const impactTimeRef = useRef(0);

  const animate = useCallback((now: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#F2F2F7';
    ctx.fillRect(0, 0, W, H);
    drawTarget(ctx);

    if (!firedRef.current) {
      const t = (now - startTimeRef.current) / 1000;
      const sway = Math.sin(t * 2.0) * (RADIUS - 12);
      drawCrosshair(ctx, CX + sway);
    } else if (dartRef.current) {
      const age = (now - impactTimeRef.current) / 1000;
      drawImpact(ctx, dartRef.current.x, dartRef.current.y, age);
    }
    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animate]);

  function handleTap() {
    if (firedRef.current) return;
    firedRef.current = true;
    impactTimeRef.current = performance.now();

    const now = performance.now();
    const t = (now - startTimeRef.current) / 1000;
    const sway = Math.sin(t * 2.0) * (RADIUS - 12);
    const x = CX + sway;
    const y = CY;
    dartRef.current = { x, y };

    const dist = Math.hypot(x - CX, y - CY);
    const { ring, label } = classifyHit(dist);

    commitArchery({ drawTimeMs: now - startTimeRef.current, drawPower: 1, hitDistance: dist/RADIUS, ring });
    computeFromArchery({ drawTimeMs: now - startTimeRef.current, drawPower: 1, hitDistance: dist/RADIUS, ring });

    if (ring === 'bullseye') { audio.bullseye(); haptics.jackpot(); }
    else { audio.impact(); haptics.tick(); }

    setResultText(label);
    setTimeout(() => go('round2'), 1800);
  }

  function handleSkip() {
    audio.tap();
    haptics.press();
    go('round2');
  }

  return (
    <div className="relative w-full h-[100dvh] bg-[#F2F2F7] overflow-hidden select-none" style={{ touchAction: 'none' }}>
      <div className="absolute inset-0 flex items-center justify-center">
        <canvas ref={canvasRef} width={W} height={H} className="w-full max-w-[400px]" style={{ aspectRatio: `${W}/${H}` }} onPointerDown={handleTap} />
      </div>

      <div className="absolute inset-x-0 top-12 flex flex-col items-center gap-3 px-6 pointer-events-none">
        <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[13px] font-bold">
          BONUS ROUND
        </div>
        <h2 className="text-[26px] font-bold text-ink text-center">Bullseye Reward</h2>
        <p className="text-ink/60 text-[15px] text-center">Tap to aim! Earn a luck boost.</p>
      </div>

      <AnimatePresence>
        {resultText && (
          <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-white px-8 py-4 rounded-3xl shadow-elevated" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <span className="text-xl font-bold text-ink">{resultText}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-10 inset-x-0 flex justify-center px-6">
        <button onClick={handleSkip} className="bg-white/80 backdrop-blur px-8 py-4 rounded-2xl text-[15px] font-bold text-ink shadow-card pointer-events-auto">
          Skip Bonus
        </button>
      </div>
    </div>
  );
}
