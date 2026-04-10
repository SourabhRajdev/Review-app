import { motion } from 'framer-motion';
import ScreenShell from './ScreenShell';
import { useNavigation } from './useNavigation';
import { useChoiceStore } from '@/architecture/choice/store';
import type { Occasion } from '@/architecture/choice/types';
import { spring, tapScale, staggerContainer, staggerItem } from '@/design/motion';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';

const OPTIONS: { id: Occasion; label: string; icon: string }[] = [
  { id: 'work_break', label: 'Quick work break', icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7' },
  { id: 'morning_routine', label: 'Morning routine', icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707' },
  { id: 'catching_up', label: 'Catching up', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { id: 'treating_myself', label: 'Treating myself', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
  { id: 'date', label: 'Date', icon: 'M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z' },
  { id: 'first_try', label: 'First time trying it', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' }
];

export default function OccasionScreen() {
  const go = useNavigation((s) => s.go);
  const setOccasion = useChoiceStore((s) => s.setOccasion);

  function pick(id: Occasion) {
    setOccasion(id);
    audio.tap();
    haptics.tick();
    setTimeout(() => go('menu'), 300);
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
          What brought you in?
        </motion.h2>
        <motion.p
          className="text-ink-muted text-[15px] mb-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Pick the one that fits.
        </motion.p>

        <motion.div
          className="grid grid-cols-2 gap-3 w-full max-w-[360px] mx-auto"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {OPTIONS.map((opt) => (
            <motion.button
              key={opt.id}
              className="glass-card shadow-card rounded-2xl px-4 py-4 text-center cursor-pointer hover:shadow-card-lg transition-shadow duration-200 flex flex-col items-center gap-3"
              variants={staggerItem}
              whileTap={tapScale.whileTap}
              onClick={() => pick(opt.id)}
            >
              <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#C67C4E"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={opt.icon} />
                </svg>
              </div>
              <span className="text-[14px] font-semibold text-ink leading-tight">{opt.label}</span>
            </motion.button>
          ))}
        </motion.div>
      </div>
    </ScreenShell>
  );
}
