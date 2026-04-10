import { useState } from 'react';
import { motion } from 'framer-motion';
import ScreenShell from './ScreenShell';
import { useNavigation } from './useNavigation';
import { useChoiceStore } from '@/architecture/choice/store';
import { useRewardStore, selectLuck, selectTier } from '@/architecture/reward/store';
import { spring } from '@/design/motion';
import AnimatedChip from '@/components/AnimatedChip';
import PrimaryButton from '@/components/PrimaryButton';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';

const CHIPS = [
  'Hot', 'Fresh', 'Crispy', 'Creamy', 'Rich', 'Perfectly sweet',
  'A little bland', 'Could be hotter', 'Portion was small', 'Looked amazing'
];

export default function SensoryChipsScreen() {
  const go = useNavigation((s) => s.go);
  const setSensoryChips = useChoiceStore((s) => s.setSensoryChips);
  const luck = useRewardStore(selectLuck);
  const tier = useRewardStore(selectTier);
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(chip: string) {
    let next: string[];
    if (selected.includes(chip)) {
      next = selected.filter((c) => c !== chip);
    } else if (selected.length < 2) {
      next = [...selected, chip];
      audio.tick();
      haptics.tick();
    } else {
      return;
    }
    setSelected(next);
    setSensoryChips(next);
  }

  return (
    <ScreenShell className="justify-center">
      <div className="flex-1 flex flex-col justify-center items-center text-center">
        {/* Luck bar preview */}
        <motion.div
          className="w-full max-w-[300px] mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-[11px] font-medium text-ink-quiet uppercase tracking-widest mb-2">
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
          className="text-[28px] font-bold font-display text-ink mb-2"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring.gentle}
        >
          How was the food?
        </motion.h2>
        <motion.p
          className="text-ink-muted text-[15px] mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Pick up to 2 that fit.
        </motion.p>

        <motion.div
          className="flex flex-wrap justify-center gap-2.5 max-w-[360px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          {CHIPS.map((chip) => (
            <AnimatedChip
              key={chip}
              label={chip}
              selected={selected.includes(chip)}
              disabled={!selected.includes(chip) && selected.length >= 2}
              onClick={() => toggle(chip)}
            />
          ))}
        </motion.div>

        <div className="mt-10 w-full max-w-[300px]">
          <PrimaryButton
            onClick={() => {
              if (selected.length === 0) return;
              audio.tap();
              haptics.press();
              go('experienceChoice');
            }}
            disabled={selected.length === 0}
          >
            Continue
          </PrimaryButton>
        </div>
      </div>
    </ScreenShell>
  );
}
