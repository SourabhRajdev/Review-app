import { useState } from 'react';
import { motion } from 'framer-motion';
import ScreenShell from './ScreenShell';
import { useNavigation } from './useNavigation';
import { useChoiceStore } from '@/architecture/choice/store';
import type { ExperienceOpinion } from '@/architecture/choice/types';
import { spring, tapScale, staggerContainer, staggerItem } from '@/design/motion';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';

const OPTIONS: { id: ExperienceOpinion; label: string; sub: string; color: string; iconPath: string }[] = [
  {
    id: 'smooth',
    label: 'Smooth experience',
    sub: 'Everything was great',
    color: '#4CAF50',
    iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
  },
  {
    id: 'okay',
    label: 'It was okay',
    sub: 'Nothing special',
    color: '#F59E0B',
    iconPath: 'M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
  },
  {
    id: 'could_be_better',
    label: 'Could be better',
    sub: 'Room for improvement',
    color: '#E53935',
    iconPath: 'M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
  }
];

export default function ExperienceChoiceScreen() {
  const go = useNavigation((s) => s.go);
  const setExperienceOpinion = useChoiceStore((s) => s.setExperienceOpinion);
  const [selected, setSelected] = useState<ExperienceOpinion | null>(null);

  function pick(id: ExperienceOpinion) {
    if (selected) return;
    setSelected(id);
    setExperienceOpinion(id);
    audio.tap();
    haptics.impact();
    setTimeout(() => go('disappointment'), 650);
  }

  return (
    <ScreenShell className="justify-center">
      <div className="flex-1 flex flex-col justify-center">
        <motion.h2
          className="text-[28px] font-bold font-display text-ink mb-2 text-center"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring.gentle}
        >
          How was the overall visit?
        </motion.h2>
        <motion.p
          className="text-ink-muted text-[15px] mb-10 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          The vibe, the service, everything.
        </motion.p>

        <motion.div
          className="flex flex-col gap-3 w-full max-w-[360px] mx-auto"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {OPTIONS.map((opt) => {
            const isSelected = selected === opt.id;
            const isDimmed = selected !== null && !isSelected;
            return (
              <motion.button
                key={opt.id}
                className={`
                  relative w-full rounded-2xl px-5 py-5 text-left cursor-pointer
                  transition-all duration-200
                  ${isSelected
                    ? 'bg-white shadow-card-warm ring-2 ring-brand/20'
                    : 'glass-card shadow-card hover:shadow-card-lg'
                  }
                  ${isDimmed ? 'opacity-25 pointer-events-none' : ''}
                `}
                variants={staggerItem}
                animate={{
                  opacity: isDimmed ? 0.25 : 1,
                  scale: isSelected ? 1.02 : 1
                }}
                whileTap={selected ? undefined : tapScale.whileTap}
                onClick={() => pick(opt.id)}
                disabled={!!selected}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${opt.color}15` }}
                  >
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={opt.color}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d={opt.iconPath} />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[17px] font-semibold text-ink">{opt.label}</p>
                    <p className="text-[13px] text-ink-muted mt-0.5">{opt.sub}</p>
                  </div>
                </div>
                {isSelected && (
                  <motion.div
                    className="absolute inset-0 rounded-2xl"
                    style={{ background: `linear-gradient(135deg, ${opt.color}08, ${opt.color}04)` }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </motion.button>
            );
          })}
        </motion.div>
      </div>
    </ScreenShell>
  );
}
