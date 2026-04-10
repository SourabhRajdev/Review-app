// Premium animated chip/pill with checkmark animation on select.

import { motion, AnimatePresence } from 'framer-motion';
import { spring } from '@/design/motion';

interface Props {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export default function AnimatedChip({ label, selected, disabled = false, onClick }: Props) {
  return (
    <motion.button
      className={`
        inline-flex items-center gap-1.5 rounded-full px-4 py-2.5
        text-[14px] font-medium border cursor-pointer
        transition-colors duration-150
        ${selected
          ? 'bg-brand text-white border-brand shadow-chip-active'
          : disabled
            ? 'bg-surface-sunken text-ink-ghost border-transparent'
            : 'bg-white text-ink-soft border-ink-ghost/30 shadow-chip hover:border-brand/30'
        }
      `}
      onClick={onClick}
      whileTap={!disabled ? { scale: 0.94 } : undefined}
      animate={{
        opacity: disabled ? 0.4 : 1,
        scale: selected ? [1, 1.06, 1] : 1
      }}
      transition={spring.snappy}
      layout
    >
      <span>{label}</span>
      <AnimatePresence>
        {selected && (
          <motion.span
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 18, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="flex items-center overflow-hidden"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <motion.path
                d="M5 10.5L9 14.5L15 7.5"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.25 }}
              />
            </svg>
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
