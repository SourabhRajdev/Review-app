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
import { spotlightHandlers, SpotlightOverlay } from '@/components/ui/spotlight-card';

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
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-primary text-label font-bold mb-3"
            style={{ background: 'rgba(198,124,78,0.1)', border: '1px solid rgba(198,124,78,0.2)' }}
          >
            <span>🎯</span>
            <span>Round 5 — Recommend</span>
          </div>

          <h2 className="text-display text-ink mb-2">Perfect for?</h2>

          <p className="text-body-sm text-ink-secondary">
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
                {...(!selected ? spotlightHandlers() : {})}
                className="relative overflow-hidden w-full rounded-2xl px-5 py-4 text-left cursor-pointer"
                style={isSelected ? {
                  background: '#FFF8F3',
                  border: '1px solid rgba(198,124,78,0.45)',
                  boxShadow: '0 0 0 3px rgba(198,124,78,0.12), 0 4px 20px rgba(0,0,0,0.06)',
                } : {
                  background: '#FFFFFF',
                  border: '1px solid rgba(200,170,140,0.2)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 20px rgba(0,0,0,0.07)',
                }}
                animate={{
                  opacity: isDimmed ? 0.25 : 1,
                  scale: isSelected ? 1.02 : 1,
                }}
                whileTap={selected ? undefined : tapScale.whileTap}
                onClick={() => pick(opt.id)}
                disabled={!!selected}
              >
                {!selected && <SpotlightOverlay color={isSelected ? 'coffee' : 'warm'} size={120} />}
                <div className="flex items-center gap-4">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl"
                    style={isSelected ? {
                      background: 'rgba(198,124,78,0.1)',
                      border: '1px solid rgba(198,124,78,0.2)',
                    } : {
                      background: '#FBF7F4',
                      border: '1px solid rgba(200,170,140,0.15)',
                    }}
                  >
                    {opt.emoji}
                  </div>
                  <div>
                    <p className="text-body font-semibold text-ink">{opt.label}</p>
                    <p className="text-label text-ink-secondary mt-0.5">{opt.sub}</p>
                  </div>
                </div>
                {isSelected && (
                  <motion.div
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #E8B896, #C67C4E)' }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={spring.snappy}
                  >
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#FFFFFF" strokeWidth={3}>
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
