import { motion } from 'framer-motion';
import ScreenShell from './ScreenShell';
import { useNavigation } from './useNavigation';
import { useChoiceStore } from '@/architecture/choice/store';
import { spring, tapScale, staggerContainer, staggerItem } from '@/design/motion';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';

const OPTIONS: { label: string; icon: string }[] = [
  { label: 'My new regular', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
  { label: 'Better than my usual spot', icon: 'M5 10l7-7m0 0l7 7m-7-7v18' },
  { label: 'Best in the area', icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z' },
  { label: 'Good but my usual spot still wins', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
  { label: 'Unique, nothing like it nearby', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' }
];

export default function ComparisonScreen() {
  const go = useNavigation((s) => s.go);
  const setComparisonChip = useChoiceStore((s) => s.setComparisonChip);

  function pick(label: string) {
    setComparisonChip(label);
    audio.tap();
    haptics.tick();
    setTimeout(() => go('bonus'), 300);
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
          How does it compare?
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
          className="flex flex-col gap-3 w-full max-w-[360px] mx-auto"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {OPTIONS.map((opt) => (
            <motion.button
              key={opt.label}
              className="glass-card shadow-card rounded-2xl px-5 py-4 text-left cursor-pointer hover:shadow-card-lg transition-shadow duration-200"
              variants={staggerItem}
              whileTap={tapScale.whileTap}
              onClick={() => pick(opt.label)}
            >
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-accent-violet/10 flex items-center justify-center flex-shrink-0">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#A78BFA"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={opt.icon} />
                  </svg>
                </div>
                <span className="text-[15px] font-semibold text-ink">{opt.label}</span>
              </div>
            </motion.button>
          ))}
        </motion.div>
      </div>
    </ScreenShell>
  );
}
