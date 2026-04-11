import { motion } from 'framer-motion';
import ScreenShell from './ScreenShell';
import { useNavigation } from './useNavigation';
import { useChoiceStore } from '@/architecture/choice/store';
import type { DisappointmentChip } from '@/architecture/choice/types';
import { spring, tapScale } from '@/design/motion';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';

const OPTIONS: { id: DisappointmentChip; label: string; icon: string }[] = [
  { id: 'nothing_perfect', label: 'Everything just clicked', icon: 'M5 13l4 4L19 7' },
  { id: 'staff_unremarkable', label: 'The staff were great', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { id: 'wait_long', label: 'Super quick service', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
  { id: 'could_be_quieter', label: 'Loved the atmosphere', icon: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z' },
  { id: 'portion_size', label: 'Generous portions', icon: 'M4 6h16M4 12h16M4 18h7' },
  { id: 'temperature', label: 'Served perfectly', icon: 'M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0-6v2m0 16v2m-8-10H2m20 0h-2m-2.05-5.95l-1.41 1.41M7.46 16.54l-1.41 1.41m0-11.9l1.41 1.41m9.08 9.08l1.41 1.41' }
];

export default function DisappointmentScreen() {
  const go = useNavigation((s) => s.go);
  const setDisappointment = useChoiceStore((s) => s.setDisappointment);

  function pick(id: DisappointmentChip) {
    setDisappointment(id);
    audio.tap();
    haptics.tick();
    setTimeout(() => go('returnChoice'), 300);
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
          What stood out?
        </motion.h2>
        <motion.p
          className="text-ink-muted text-[15px] mb-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Pick the highlight.
        </motion.p>

        <div className="grid grid-cols-2 gap-3 w-full max-w-[360px] mx-auto">
          {OPTIONS.map((opt) => (
            <motion.button
              key={opt.id}
              className="bg-surface border border-ink/5 shadow-card rounded-2xl px-4 py-4 text-center cursor-pointer hover:shadow-elevated transition-shadow duration-200 flex flex-col items-center gap-2.5"
              whileTap={tapScale.whileTap}
              onClick={() => pick(opt.id)}
            >
              <div className="w-9 h-9 rounded-lg bg-brand-good/10 flex items-center justify-center">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#4CAF50"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={opt.icon} />
                </svg>
              </div>
              <span className="text-[13px] font-semibold text-ink leading-tight">{opt.label}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </ScreenShell>
  );
}
