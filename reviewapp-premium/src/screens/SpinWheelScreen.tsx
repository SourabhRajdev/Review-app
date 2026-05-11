import { useState, useRef } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import ScreenShell from './ScreenShell';
import { useNavigation } from './useNavigation';
import { useLuckStore, type LuckTier } from '@/architecture/luck/store';
import PrimaryButton from '@/components/PrimaryButton';
import { spring } from '@/design/motion';
import { haptics } from '@/design/haptics';
import { audio } from '@/design/audio';

// ── Prize catalogue (7 prizes — no "Try Next Time") ─────────────────────────

const PRIZES = [
  { id: 0, label: 'Free Coffee',   short: 'Coffee',   emoji: '☕', tier: 'jackpot',    fill: '#6B2D0B', text: '#FFF8F0' },
  { id: 1, label: 'Free Dessert',  short: 'Dessert',  emoji: '🍰', tier: 'rare',       fill: '#C67C4E', text: '#FFFFFF' },
  { id: 2, label: '30% Off',       short: '30% Off',  emoji: '🎁', tier: 'rare',       fill: '#F0D5B8', text: '#7A3A10' },
  { id: 3, label: '20% Off',       short: '20% Off',  emoji: '✨', tier: 'uncommon',   fill: '#D4956A', text: '#FFFFFF' },
  { id: 4, label: '10% Off',       short: '10% Off',  emoji: '🏅', tier: 'common',     fill: '#F5EDE5', text: '#7A5C4A' },
  { id: 5, label: 'Size Upgrade',  short: 'Size Up',  emoji: '⬆',  tier: 'common',     fill: '#E8B896', text: '#6B3A1F' },
  { id: 6, label: '5% Off',        short: '5% Off',   emoji: '🌟', tier: 'very_common',fill: '#FAF0E6', text: '#B09080' },
] as const;

type PrizeTier = 'jackpot' | 'rare' | 'uncommon' | 'common' | 'very_common';

const PRIZE_DESCRIPTIONS: Record<PrizeTier, string> = {
  jackpot:    'Complimentary coffee on your next visit.',
  rare:       'Redeemable on your next visit. Show at checkout.',
  uncommon:   'Applied at checkout on your next order.',
  common:     'Applied at checkout on your next order.',
  very_common:'Applied at checkout on your next order.',
};

const SLICE_COUNT = PRIZES.length;
const SLICE_DEG   = 360 / SLICE_COUNT; // ~51.43°

// ── Luck-tier weights (sum = 1,000,000 per tier) ─────────────────────────────
// Better play (higher luckScore) → better prizes more likely

const LUCK_WEIGHTS: Record<LuckTier, number[]> = {
  cold: [1000,   5000,  20000,  70000, 170000, 280000, 454000],
  warm: [5000,  20000,  60000, 140000, 250000, 270000, 255000],
  hot:  [10000, 50000, 100000, 200000, 280000, 230000, 130000],
  fire: [30000, 100000, 170000, 250000, 250000, 140000, 60000],
};

const TIER_META: Record<LuckTier, { label: string; color: string; bg: string; border: string; headline: string }> = {
  cold: { label: 'COLD',  color: '#7BA7BC', bg: 'rgba(123,167,188,0.1)',  border: 'rgba(123,167,188,0.25)', headline: 'Your luck is heating up.' },
  warm: { label: 'WARM',  color: '#C67C4E', bg: 'rgba(198,124,78,0.1)',   border: 'rgba(198,124,78,0.25)',  headline: 'Good play — one spin to go.' },
  hot:  { label: 'HOT',   color: '#E8612A', bg: 'rgba(232,97,42,0.1)',    border: 'rgba(232,97,42,0.25)',   headline: 'You\'re on fire tonight!' },
  fire: { label: 'FIRE',  color: '#DC2626', bg: 'rgba(220,38,38,0.1)',    border: 'rgba(220,38,38,0.25)',   headline: 'Maximum luck unlocked.' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function clientSpin(tier: LuckTier): number {
  const weights = LUCK_WEIGHTS[tier];
  const roll = Math.floor(Math.random() * 1_000_000);
  let cumulative = 0;
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (roll < cumulative) return i;
  }
  return SLICE_COUNT - 1;
}

function calcFinalRot(prizeIdx: number): number {
  return 8 * 360 - (prizeIdx + 0.5) * SLICE_DEG;
}

// ── Confetti ──────────────────────────────────────────────────────────────────

function Confetti() {
  const COLORS = ['#F59E0B', '#FCD34D', '#C67C4E', '#E8B896', '#0D9E6F', '#D97706', '#6B2D0B'];
  const particles = useRef(
    Array.from({ length: 55 }, (_, i) => ({
      id: i,
      color: COLORS[i % COLORS.length],
      size: 5 + Math.random() * 7,
      tx: (Math.random() - 0.5) * 360,
      ty: -(Math.random() * 240) - 50,
      rot: Math.random() * 720 - 360,
      delay: Math.random() * 0.4,
      circle: Math.random() > 0.5,
    }))
  ).current;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute"
          style={{
            left: '50%', top: '38%',
            width: p.size,
            height: p.circle ? p.size : p.size * 1.6,
            backgroundColor: p.color,
            borderRadius: p.circle ? '50%' : '2px',
          }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0 }}
          animate={{
            x: p.tx,
            y: [p.ty, p.ty + 480],
            opacity: [1, 1, 0],
            rotate: p.rot,
            scale: [0, 1.2, 1, 0.3],
          }}
          transition={{
            duration: 2,
            delay: p.delay,
            ease: [0.16, 1, 0.3, 1],
            y:       { duration: 2.3, ease: 'easeIn',  delay: p.delay },
            opacity: { duration: 2.3,                   delay: p.delay },
          }}
        />
      ))}
    </div>
  );
}

// ── Luckometer display ────────────────────────────────────────────────────────

function LuckometerDisplay() {
  const totalLuck  = useLuckStore((s) => s.totalLuck);
  const tier       = useLuckStore((s) => s.tier);
  const basketball = useLuckStore((s) => s.basketballLuck);
  const slingshot  = useLuckStore((s) => s.slingshotLuck);
  const cup        = useLuckStore((s) => s.cupGameLuck);
  const tc = TIER_META[tier];

  return (
    <motion.div
      className="w-full max-w-[340px] rounded-2xl p-4 mb-6"
      style={{
        background: '#FFFFFF',
        border: `1px solid ${tc.border}`,
        boxShadow: `0 2px 16px ${tc.bg}`,
      }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring.gentle, delay: 0.08 }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-caption text-ink-tertiary font-medium">Your Luck Meter</span>
        <motion.span
          className="text-caption font-black px-2 py-0.5 rounded-full"
          style={{ background: tc.bg, color: tc.color, border: `1px solid ${tc.border}` }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ ...spring.snappy, delay: 0.3 }}
        >
          {tc.label}
        </motion.span>
      </div>

      {/* Bar */}
      <div className="w-full h-3 rounded-full overflow-hidden mb-2" style={{ background: 'rgba(200,170,140,0.15)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${tc.color}66, ${tc.color})` }}
          initial={{ width: 0 }}
          animate={{ width: `${totalLuck}%` }}
          transition={{ delay: 0.2, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      {/* Score breakdown */}
      <div className="flex items-center justify-between mt-2.5">
        {[
          { label: 'Basketball', pts: basketball, max: 35 },
          { label: 'Slingshot',  pts: slingshot,  max: 35 },
          { label: 'Cup Game',   pts: cup,         max: 30 },
        ].map((g) => (
          <div key={g.label} className="flex flex-col items-center gap-0.5">
            <span className="font-bold text-sm" style={{ color: g.pts > 0 ? tc.color : '#B09080' }}>
              +{g.pts}
            </span>
            <span className="text-[10px] text-ink-tertiary">{g.label}</span>
          </div>
        ))}
        <div className="flex flex-col items-center gap-0.5">
          <span className="font-black text-sm" style={{ color: tc.color }}>{totalLuck}</span>
          <span className="text-[10px] text-ink-tertiary">Total</span>
        </div>
      </div>
    </motion.div>
  );
}

// ── Wheel SVG ─────────────────────────────────────────────────────────────────

function WheelSVG({ highlightIdx }: { highlightIdx: number | null }) {
  const CX = 150, CY = 150, R = 130, ri = 46;

  return (
    <svg width="300" height="300" viewBox="0 0 300 300" style={{ overflow: 'visible' }}>
      <defs>
        <filter id="spin-shadow" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="rgba(0,0,0,0.22)" />
        </filter>
        <filter id="center-shadow">
          <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="rgba(0,0,0,0.15)" />
        </filter>
        <radialGradient id="shine" cx="35%" cy="25%" r="55%">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.28)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <radialGradient id="centerGrad" cx="40%" cy="30%" r="65%">
          <stop offset="0%"   stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F0DDD0" />
        </radialGradient>
        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="rgba(232,184,150,0.6)" />
          <stop offset="50%"  stopColor="rgba(198,124,78,0.4)" />
          <stop offset="100%" stopColor="rgba(232,184,150,0.6)" />
        </linearGradient>
      </defs>

      {/* Decorative outer rings */}
      <circle cx={CX} cy={CY} r={R + 12} fill="none" stroke="url(#ringGrad)" strokeWidth="2" />
      <circle cx={CX} cy={CY} r={R +  7} fill="none" stroke="rgba(198,124,78,0.12)" strokeWidth="1" />

      {/* Tick marks */}
      {Array.from({ length: SLICE_COUNT }, (_, i) => {
        const rad = (i * SLICE_DEG - 90) * Math.PI / 180;
        return (
          <line key={i}
            x1={CX + (R + 5)  * Math.cos(rad)} y1={CY + (R + 5)  * Math.sin(rad)}
            x2={CX + (R + 12) * Math.cos(rad)} y2={CY + (R + 12) * Math.sin(rad)}
            stroke="rgba(198,124,78,0.6)" strokeWidth="2" strokeLinecap="round"
          />
        );
      })}

      {/* Slices */}
      <g filter="url(#spin-shadow)">
        {PRIZES.map((prize, i) => {
          const startRad = (i * SLICE_DEG - 90) * Math.PI / 180;
          const endRad   = ((i + 1) * SLICE_DEG - 90) * Math.PI / 180;
          const midRad   = ((i + 0.5) * SLICE_DEG - 90) * Math.PI / 180;
          const midDeg   = (i + 0.5) * SLICE_DEG - 90;

          const d = [
            `M ${CX + ri * Math.cos(startRad)} ${CY + ri * Math.sin(startRad)}`,
            `L ${CX + R  * Math.cos(startRad)} ${CY + R  * Math.sin(startRad)}`,
            `A ${R} ${R} 0 0 1 ${CX + R  * Math.cos(endRad)} ${CY + R  * Math.sin(endRad)}`,
            `L ${CX + ri * Math.cos(endRad)}   ${CY + ri * Math.sin(endRad)}`,
            `A ${ri} ${ri} 0 0 0 ${CX + ri * Math.cos(startRad)} ${CY + ri * Math.sin(startRad)}`,
          ].join(' ');

          const labelR = (R + ri) / 2 + 5;
          const lx = CX + labelR * Math.cos(midRad);
          const ly = CY + labelR * Math.sin(midRad);
          const isBottomHalf = midDeg > 0 && midDeg < 180;
          const textRot = isBottomHalf ? midDeg - 90 : midDeg + 90;
          const highlighted = highlightIdx === i;

          return (
            <g key={prize.id}>
              <path
                d={d}
                fill={prize.fill}
                stroke={highlighted ? '#C67C4E' : 'rgba(255,255,255,0.45)'}
                strokeWidth={highlighted ? 3 : 1.5}
              />
              <g transform={`translate(${lx},${ly}) rotate(${textRot})`}>
                <text x={0} y={-10} textAnchor="middle" dominantBaseline="auto"
                  fontSize="16" style={{ userSelect: 'none', pointerEvents: 'none' }}>
                  {prize.emoji}
                </text>
                <text x={0} y={8} textAnchor="middle" dominantBaseline="auto"
                  fontSize="7.5" fontWeight="700" letterSpacing="0.3"
                  fill={prize.text} fontFamily="Outfit, system-ui, sans-serif"
                  style={{ userSelect: 'none', pointerEvents: 'none' }}>
                  {prize.short}
                </text>
              </g>
            </g>
          );
        })}

        {/* Separator lines */}
        {Array.from({ length: SLICE_COUNT }, (_, i) => {
          const rad = (i * SLICE_DEG - 90) * Math.PI / 180;
          return (
            <line key={i}
              x1={CX + ri * Math.cos(rad)} y1={CY + ri * Math.sin(rad)}
              x2={CX + R  * Math.cos(rad)} y2={CY + R  * Math.sin(rad)}
              stroke="rgba(255,255,255,0.55)" strokeWidth="1.5"
            />
          );
        })}

        <circle cx={CX} cy={CY} r={R} fill="url(#shine)" />
      </g>

      {/* Center medallion */}
      <circle cx={CX} cy={CY} r={ri + 4} fill="#FAF9F7" stroke="rgba(200,170,140,0.55)" strokeWidth="2.5" filter="url(#center-shadow)" />
      <circle cx={CX} cy={CY} r={ri}     fill="url(#centerGrad)" />
      <circle cx={CX} cy={CY} r={ri - 7} fill="none" stroke="rgba(198,124,78,0.22)" strokeWidth="1" />
      <text x={CX} y={CY + 8} textAnchor="middle" fontSize="24"
        style={{ userSelect: 'none', pointerEvents: 'none' }}>☕</text>
    </svg>
  );
}

// ── RTP info sheet ────────────────────────────────────────────────────────────

function RTPSheet({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-end justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <motion.div
        className="relative w-full max-w-[480px] rounded-t-3xl overflow-hidden"
        style={{ background: '#FFFFFF', border: '1px solid rgba(200,170,140,0.2)' }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={spring.gentle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(200,170,140,0.4)' }} />
        </div>
        <div className="px-6 pt-2 pb-8">
          <h3 className="text-heading text-ink mb-1">How it works</h3>
          <p className="text-body text-ink-secondary mb-5">
            Prizes are drawn using a weighted random algorithm. Your luckometer
            score — earned across basketball, slingshot, and the cup game —
            determines which tier you land in.
          </p>
          <div className="space-y-2 mb-4">
            {[
              { tier: 'COLD  (0–25)',   prizes: '5% Off most likely' },
              { tier: 'WARM (26–50)',   prizes: '10% Off most likely' },
              { tier: 'HOT  (51–75)',   prizes: '20% Off most likely' },
              { tier: 'FIRE (76–100)', prizes: 'Free Coffee possible' },
            ].map((row) => (
              <div key={row.tier} className="flex items-center justify-between">
                <span className="text-label text-ink">{row.tier}</span>
                <span className="text-label text-ink-secondary">{row.prizes}</span>
              </div>
            ))}
          </div>
          <p className="text-caption text-ink-tertiary">
            Every spin has a real prize — no "try next time" outcomes.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Result card ───────────────────────────────────────────────────────────────

function ResultCard({ prizeIdx, onContinue }: { prizeIdx: number; onContinue: () => void }) {
  const prize = PRIZES[prizeIdx];
  const isTop3 = prizeIdx <= 2;

  return (
    <>
      {isTop3 && <Confetti />}

      <motion.div
        className="fixed inset-0 z-20"
        style={{ background: 'rgba(26,14,8,0.45)', backdropFilter: 'blur(6px)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />

      <motion.div
        className="fixed inset-x-0 bottom-0 z-30 flex justify-center"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        transition={spring.gentle}
      >
        <div className="w-full max-w-[480px] rounded-t-3xl overflow-hidden px-6 pt-6 pb-10 safe-bottom"
          style={{
            background: '#FFFFFF',
            borderTop: '1px solid rgba(200,170,140,0.25)',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
          }}
        >
          <div className="flex justify-center mb-5">
            <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(200,170,140,0.35)' }} />
          </div>

          <motion.div
            className="text-center mb-4"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ ...spring.snappy, delay: 0.15 }}
          >
            <span style={{ fontSize: 64, lineHeight: 1 }}>{prize.emoji}</span>
          </motion.div>

          <motion.div
            className="text-center mb-2"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring.gentle, delay: 0.25 }}
          >
            <div
              className="inline-block px-3 py-1 rounded-full text-caption font-bold uppercase tracking-widest mb-3"
              style={{ background: 'rgba(198,124,78,0.1)', color: '#C67C4E' }}
            >
              {prize.tier.replace('_', ' ')}
            </div>
            <h2
              className="font-black leading-tight mb-2"
              style={{
                fontSize: '2rem',
                background: 'linear-gradient(135deg, #E8B896, #C67C4E, #8B4513)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {prize.label}
            </h2>
            <p className="text-body text-ink-secondary max-w-[280px] mx-auto">
              {PRIZE_DESCRIPTIONS[prize.tier as PrizeTier]}
            </p>
          </motion.div>

          <div className="my-5 h-px" style={{ background: 'rgba(200,170,140,0.2)' }} />

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <PrimaryButton onClick={onContinue}>
              Continue to Review
            </PrimaryButton>
          </motion.div>
        </div>
      </motion.div>
    </>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

type Phase = 'idle' | 'spinning' | 'done';

export default function SpinWheelScreen() {
  const go = useNavigation((s) => s.go);
  const totalLuck = useLuckStore((s) => s.totalLuck);
  const tier      = useLuckStore((s) => s.tier);
  const tc        = TIER_META[tier];

  const [phase, setPhase]       = useState<Phase>('idle');
  const [prizeIdx, setPrizeIdx] = useState<number | null>(null);
  const [showRTP, setShowRTP]   = useState(false);

  const wheelControls = useAnimation();
  const spinningRef   = useRef(false);

  async function handleSpin() {
    if (spinningRef.current) return;
    spinningRef.current = true;

    haptics.press();
    audio.tap();
    setPhase('spinning');

    // Task 4: Determined solely by Luck-O-Meter score (0-100)
    const sanitizedScore = (typeof totalLuck === 'number' && !isNaN(totalLuck)) ? totalLuck : 0;
    
    let resolvedIdx: number;
    try {
      const res = await fetch('/api/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ luckScore: sanitizedScore }),
      });
      if (!res.ok) throw new Error('api_error');
      const data = await res.json();
      resolvedIdx = data.prizeIdx as number;
    } catch {
      resolvedIdx = clientSpin(tier);
    }

    setPrizeIdx(resolvedIdx);

    await wheelControls.start({
      rotate: calcFinalRot(resolvedIdx),
      transition: { duration: 5.2, ease: [0.05, 0.7, 0.1, 1.0] },
    });

    if (resolvedIdx === 0) {
      haptics.jackpot();
      audio.bullseye();
    } else {
      haptics.impact();
      audio.perfect();
    }

    setPhase('done');
    spinningRef.current = false;
  }

  async function handleContinue() {
    haptics.press();
    audio.tap();
    
    // Request clipboard permission in user gesture for later auto-copy
    try {
      await navigator.clipboard.writeText('');
    } catch {
      // Permission denied or not supported
    }
    
    go('generating');
  }

  const isSpinning = phase === 'spinning';

  return (
    <ScreenShell hideProgress hideBack>
      <AnimatePresence>
        {showRTP && <RTPSheet onClose={() => setShowRTP(false)} />}
      </AnimatePresence>

      <div className="flex-1 flex flex-col items-center py-6 px-4 relative">

        {/* Top bar */}
        <div className="w-full flex items-center justify-between mb-4">
          <motion.div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-caption font-semibold"
            style={{ background: tc.bg, color: tc.color, border: `1px solid ${tc.border}` }}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={spring.gentle}
          >
            <span>Bonus Reward</span>
          </motion.div>

          <motion.button
            onClick={() => setShowRTP(true)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-caption font-bold cursor-pointer"
            style={{
              background: 'rgba(176,144,128,0.12)',
              color: '#B09080',
              border: '1px solid rgba(176,144,128,0.2)',
            }}
            whileTap={{ scale: 0.9 }}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={spring.gentle}
          >
            i
          </motion.button>
        </div>

        {/* Headline */}
        <motion.div
          className="text-center mb-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring.gentle, delay: 0.04 }}
        >
          <h1 className="text-heading text-ink mb-1">Spin for a reward</h1>
          <p className="text-body text-ink-secondary">{tc.headline}</p>
        </motion.div>

        {/* Luckometer */}
        <LuckometerDisplay />

        {/* Wheel */}
        <motion.div
          className="relative mb-6"
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...spring.gentle, delay: 0.12 }}
        >
          {/* Pointer */}
          <div className="absolute left-1/2 -translate-x-1/2 z-10" style={{ top: -14 }}>
            <svg width="28" height="20" viewBox="0 0 28 20">
              <defs>
                <filter id="ptr-shadow">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(0,0,0,0.25)" />
                </filter>
              </defs>
              <polygon points="14,18 2,2 26,2" fill="#C67C4E" filter="url(#ptr-shadow)" />
              <polygon points="14,16 4,3 24,3" fill="url(#ringGrad)" />
              <polygon points="14,14 6,4 22,4" fill="#E8B896" opacity="0.5" />
            </svg>
          </div>

          {/* Rotating wheel */}
          <motion.div
            animate={wheelControls}
            style={{ width: 300, height: 300, transformOrigin: 'center' }}
          >
            <WheelSVG highlightIdx={phase === 'done' ? prizeIdx : null} />
          </motion.div>
        </motion.div>

        {/* Spin / spinning state */}
        <motion.div
          className="w-full max-w-[320px]"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring.gentle, delay: 0.2 }}
        >
          {phase === 'idle' && (
            <PrimaryButton onClick={handleSpin}>
              Spin the Wheel
            </PrimaryButton>
          )}

          {isSpinning && (
            <motion.div
              className="flex items-center justify-center gap-2 py-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {[0, 0.1, 0.2].map((d, i) => (
                <motion.span
                  key={i}
                  className="w-2 h-2 rounded-full"
                  style={{ background: tc.color }}
                  animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 0.7, repeat: Infinity, delay: d }}
                />
              ))}
            </motion.div>
          )}
        </motion.div>

        {phase === 'idle' && (
          <motion.p
            className="text-caption text-ink-tertiary mt-3 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Every spin wins — no blanks
          </motion.p>
        )}
      </div>

      <AnimatePresence>
        {phase === 'done' && prizeIdx !== null && (
          <ResultCard prizeIdx={prizeIdx} onContinue={handleContinue} />
        )}
      </AnimatePresence>
    </ScreenShell>
  );
}
