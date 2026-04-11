// SERVICE GAME SCREEN — "Perfect for?"
// Single-select cards. Tap one to commit and advance.
// Replaces the old wait-time slider with a recommendation signal.

import { useState } from 'react';
import { motion } from 'framer-motion';
import ScreenShell from './ScreenShell';
import { useNavigation } from './useNavigation';
import { useGameStore } from '@/architecture/game/store';
import { spring, tapScale } from '@/design/motion';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';

const OPTIONS = [
  { id: 'solo_work', label: 'Solo work', emoji: '💻', sub: 'Quiet focus time' },
  { id: 'friends', label: 'With friends', emoji: '👯', sub: 'Catching up & laughs' },
  { id: 'date', label: 'Date spot', emoji: '💕', sub: 'Cozy & intimate' },
  { id: 'family', label: 'Family outing', emoji: '👨‍👩‍👧', sub: 'Relaxed & welcoming' },
  { id: 'quick_break', label: 'Quick break', emoji: '☕', sub: 'In and out, recharged' },
];

export default function ServiceGameScreen() {
  const go = useNavigation((s) => s.go);
  const setPerfectFor = useGameStore((s) => s.setPerfectFor);
  const [selected, setSelected] = useState<string | null>(null);

  function pick(id: string) {
    if (selected) return;
    setSelected(id);
    setPerfectFor(id);
    audio.tap();
    haptics.impact();
    setTimeout(() => go('slingshotGame'), 550);
  }

  return (
    <ScreenShell>
      <motion.div
        className="flex-1 flex flex-col justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={spring.gentle}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-[13px] font-semibold mb-3">
            <span>🎯</span>
            <span>Round 5 — Recommend</span>
          </div>

          <h2 className="text-[26px] font-bold text-ink mb-2">
            Perfect for?
          </h2>

          <p className="text-[15px] text-ink/60">
            Who would you bring here?
          </p>
        </div>

        {/* Option cards */}
        <div className="flex flex-col gap-3 w-full max-w-[360px] mx-auto">
          {OPTIONS.map((opt) => {
            const isSelected = selected === opt.id;
            const isDimmed = selected !== null && !isSelected;
            return (
              <motion.button
                key={opt.id}
                className={`
                  relative w-full rounded-2xl px-5 py-4 text-left cursor-pointer
                  transition-all duration-200
                  ${isSelected
                    ? 'bg-surface shadow-elevated ring-2 ring-primary/20'
                    : 'bg-surface border border-ink/5 shadow-card hover:shadow-elevated'
                  }
                  ${isDimmed ? 'opacity-20 pointer-events-none' : ''}
                `}
                animate={{
                  opacity: isDimmed ? 0.2 : 1,
                  scale: isSelected ? 1.02 : 1,
                }}
                whileTap={selected ? undefined : tapScale.whileTap}
                onClick={() => pick(opt.id)}
                disabled={!!selected}
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-2xl">
                    {opt.emoji}
                  </div>
                  <div>
                    <p className="text-[16px] font-semibold text-ink">{opt.label}</p>
                    <p className="text-[13px] text-ink/60 mt-0.5">{opt.sub}</p>
                  </div>
                </div>
                {isSelected && (
                  <motion.div
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={spring.snappy}
                  >
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </ScreenShell>
  );
}
