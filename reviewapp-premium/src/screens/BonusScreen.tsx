import { useState } from 'react';
import { motion } from 'framer-motion';
import ScreenShell from './ScreenShell';
import { useNavigation } from './useNavigation';
import { useChoiceStore } from '@/architecture/choice/store';
import { useRewardStore, selectLuck, selectTier } from '@/architecture/reward/store';
import type { VibeTag, RecommendFor } from '@/architecture/choice/types';
import { spring } from '@/design/motion';
import AnimatedChip from '@/components/AnimatedChip';
import PrimaryButton from '@/components/PrimaryButton';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';

const VIBES: { id: VibeTag; label: string }[] = [
  { id: 'cozy', label: 'Cozy corner' },
  { id: 'work_friendly', label: 'Work-friendly' },
  { id: 'quiet', label: 'Quiet and calm' },
  { id: 'energizing', label: 'Energizing' },
  { id: 'great_music', label: 'Great music' },
  { id: 'instagram_worthy', label: 'Instagram-worthy' },
  { id: 'social', label: 'Social and buzzing' }
];

const RECOMMEND: { id: RecommendFor; label: string }[] = [
  { id: 'solo_work', label: 'Solo work' },
  { id: 'friends', label: 'With friends' },
  { id: 'date', label: 'Date' },
  { id: 'family', label: 'Family' },
  { id: 'quick_break', label: 'Quick break' }
];

export default function BonusScreen() {
  const go = useNavigation((s) => s.go);
  const setVibeChips = useChoiceStore((s) => s.setVibeChips);
  const setRecommendFor = useChoiceStore((s) => s.setRecommendFor);
  const luck = useRewardStore(selectLuck);
  const tier = useRewardStore(selectTier);

  const [vibes, setVibes] = useState<VibeTag[]>([]);
  const [rec, setRec] = useState<RecommendFor | null>(null);

  function toggleVibe(id: VibeTag) {
    let next: VibeTag[];
    if (vibes.includes(id)) {
      next = vibes.filter((v) => v !== id);
    } else if (vibes.length < 2) {
      next = [...vibes, id];
      audio.tick();
      haptics.tick();
    } else {
      return;
    }
    setVibes(next);
    setVibeChips(next);
  }

  function pickRec(id: RecommendFor) {
    setRec(id);
    setRecommendFor(id);
    audio.tick();
    haptics.tick();
  }

  const canContinue = vibes.length > 0 && rec !== null;

  return (
    <ScreenShell>
      {/* Luck bar */}
      <motion.div
        className="mt-4 mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <p className="text-[11px] font-medium text-ink-quiet uppercase tracking-widest mb-2 text-center">
          Luck \u00B7 {tier || '\u2014'}
        </p>
        <div className="h-1.5 rounded-full bg-surface-sunken overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-amber"
            initial={{ width: 0 }}
            animate={{ width: `${luck * 100}%` }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </motion.div>

      <motion.h2
        className="text-[28px] font-bold font-display text-ink mb-1 text-center"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring.gentle}
      >
        Almost done
      </motion.h2>
      <motion.p
        className="text-ink-muted text-[15px] mb-6 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        Two quick taps.
      </motion.p>

      {/* Vibe section */}
      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <p className="text-[14px] font-semibold text-ink mb-3">
          What's the vibe? <span className="text-ink-quiet font-normal">(pick up to 2)</span>
        </p>
        <div className="flex flex-wrap gap-2.5">
          {VIBES.map((v) => (
            <AnimatedChip
              key={v.id}
              label={v.label}
              selected={vibes.includes(v.id)}
              disabled={!vibes.includes(v.id) && vibes.length >= 2}
              onClick={() => toggleVibe(v.id)}
            />
          ))}
        </div>
      </motion.div>

      {/* Recommend for section */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <p className="text-[14px] font-semibold text-ink mb-3">Perfect for?</p>
        <div className="flex flex-wrap gap-2.5">
          {RECOMMEND.map((r) => (
            <AnimatedChip
              key={r.id}
              label={r.label}
              selected={rec === r.id}
              onClick={() => pickRec(r.id)}
            />
          ))}
        </div>
      </motion.div>

      {/* CTA */}
      <PrimaryButton
        onClick={() => {
          if (!canContinue) return;
          audio.tap();
          haptics.press();
          go('basketball');
        }}
        disabled={!canContinue}
        className="mb-8"
      >
        Write my review
      </PrimaryButton>
    </ScreenShell>
  );
}
