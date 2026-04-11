import { motion } from 'framer-motion';
import ScreenShell from './ScreenShell';
import { useNavigation } from './useNavigation';
import { useChoiceStore } from '@/architecture/choice/store';
import type { VisitType } from '@/architecture/choice/types';
import { spring, tapScale } from '@/design/motion';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';

const OPTIONS: { id: VisitType; label: string; sub: string; icon: string }[] = [
  {
    id: 'first_time',
    label: 'First time here',
    sub: 'Just discovered this place',
    icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5'
  },
  {
    id: 'returning',
    label: 'Been here before',
    sub: 'Coming back for more',
    icon: 'M3 12a9 9 0 1018 0 9 9 0 00-18 0zm9-3v3l3 3'
  }
];

export default function VisitTypeScreen() {
  const go = useNavigation((s) => s.go);
  const setVisitType = useChoiceStore((s) => s.setVisitType);

  function pick(id: VisitType) {
    setVisitType(id);
    audio.tap();
    haptics.tick();
    setTimeout(() => go('occasion'), 300);
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
          Have you been here before?
        </motion.h2>
        <motion.p
          className="text-ink-muted text-[15px] mb-10 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          One tap, that's it.
        </motion.p>

        <div className="flex flex-col gap-3 w-full max-w-[360px] mx-auto">
          {OPTIONS.map((opt) => (
            <motion.button
              key={opt.id}
              className="bg-surface border border-ink/5 shadow-card rounded-2xl px-5 py-5 text-left cursor-pointer hover:shadow-elevated transition-shadow duration-200"
              whileTap={tapScale.whileTap}
              onClick={() => pick(opt.id)}
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-brand/10 flex items-center justify-center flex-shrink-0">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#C67C4E"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={opt.icon} />
                  </svg>
                </div>
                <div>
                  <p className="text-[17px] font-semibold text-ink">{opt.label}</p>
                  <p className="text-[13px] text-ink-muted mt-0.5">{opt.sub}</p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </ScreenShell>
  );
}
