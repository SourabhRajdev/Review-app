// PRODUCT CHOICE SCREEN — Game 1 Choice Layer
// 3 glass cards. User taps one opinion. That choice is committed to store.
// Currently not wired into the main flow (App.tsx).

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ScreenShell from './ScreenShell';
import { useNavigation } from './useNavigation';
import { useChoiceStore } from '@/architecture/choice/store';
import type { ProductOpinion } from '@/architecture/choice/types';
import { spring, tapScale, staggerContainer, staggerItem } from '@/design/motion';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';

const OPTIONS: { id: ProductOpinion; label: string; sub: string; color: string; iconPath: string }[] = [
  {
    id: 'loved',
    label: 'Loved it',
    sub: 'Exceeded expectations',
    color: '#4CAF50',
    iconPath: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'
  },
  {
    id: 'okay',
    label: 'It was okay',
    sub: 'Nothing special',
    color: '#F59E0B',
    iconPath: 'M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905a3.61 3.61 0 01-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5'
  },
  {
    id: 'not_great',
    label: 'Not great',
    sub: 'Room for improvement',
    color: '#E53935',
    iconPath: 'M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
  }
];

export default function ProductChoiceScreen() {
  const go = useNavigation((s) => s.go);
  const setProductOpinion = useChoiceStore((s) => s.setProductOpinion);
  const [selected, setSelected] = useState<ProductOpinion | null>(null);

  function handlePick(id: ProductOpinion) {
    if (selected) return;
    setSelected(id);
    setProductOpinion(id);
    audio.tap();
    haptics.impact();
    setTimeout(() => go('sensoryChips'), 650);
  }

  return (
    <ScreenShell className="justify-center">
      <div className="flex-1 flex flex-col justify-center items-center">
        <motion.h2
          className="text-[28px] font-bold font-display text-center text-ink mb-2"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring.gentle}
        >
          How was the food?
        </motion.h2>
        <motion.p
          className="text-ink-muted text-[15px] mb-10 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          One tap. Be honest.
        </motion.p>

        <motion.div
          className="flex flex-col gap-3 w-full max-w-[360px]"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <AnimatePresence>
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
                  onClick={() => handlePick(opt.id)}
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
                </motion.button>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </div>
    </ScreenShell>
  );
}
