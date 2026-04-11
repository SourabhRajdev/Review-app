import { useState } from 'react';
import { motion } from 'framer-motion';
import ScreenShell from './ScreenShell';
import { useNavigation } from './useNavigation';
import { useChoiceStore } from '@/architecture/choice/store';
import type { ReturnIntent } from '@/architecture/choice/types';
import { spring, tapScale } from '@/design/motion';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';

const OPTIONS: { id: ReturnIntent; label: string; sub: string; iconPath: string; color: string }[] = [
  {
    id: 'new_regular',
    label: 'My new regular',
    sub: 'Definitely coming back',
    iconPath: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    color: '#4CAF50'
  },
  {
    id: 'will_return',
    label: 'Will return',
    sub: 'Worth another visit',
    iconPath: 'M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905a3.61 3.61 0 01-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5',
    color: '#C67C4E'
  },
  {
    id: 'maybe',
    label: 'Maybe',
    sub: 'Not sure yet',
    iconPath: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01',
    color: '#F59E0B'
  }
];

export default function ReturnChoiceScreen() {
  const go = useNavigation((s) => s.go);
  const setReturnIntent = useChoiceStore((s) => s.setReturnIntent);
  const [selected, setSelected] = useState<ReturnIntent | null>(null);

  function pick(id: ReturnIntent) {
    if (selected) return;
    setSelected(id);
    setReturnIntent(id);
    audio.tap();
    haptics.impact();
    setTimeout(() => go('comparison'), 650);
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
          Coming back?
        </motion.h2>
        <motion.p
          className="text-ink-muted text-[15px] mb-10 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          One tap.
        </motion.p>

        <div className="flex flex-col gap-3 w-full max-w-[360px] mx-auto">
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
                    ? 'bg-surface shadow-elevated ring-2 ring-primary/20'
                    : 'bg-surface border border-ink/5 shadow-card hover:shadow-elevated'
                  }
                  ${isDimmed ? 'opacity-25 pointer-events-none' : ''}
                `}
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
              </motion.button>
            );
          })}
        </div>
      </div>
    </ScreenShell>
  );
}
