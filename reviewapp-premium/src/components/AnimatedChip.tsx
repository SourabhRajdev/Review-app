import { motion } from 'framer-motion';

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
        inline-flex items-center gap-1.5 rounded-chip px-4 py-2.5
        text-body-sm font-medium border cursor-pointer
        transition-colors duration-150
        ${selected
          ? 'bg-primary text-white border-primary'
          : disabled
            ? 'bg-surface-secondary text-ink-tertiary border-transparent'
            : 'bg-surface text-ink-secondary border-ink-ghost hover:border-ink-tertiary'
        }
      `}
      onClick={onClick}
      whileTap={!disabled ? { scale: 0.96 } : undefined}
      disabled={disabled}
      style={{ opacity: disabled ? 0.4 : 1 }}
    >
      <span>{label}</span>
      {selected && (
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
          <path
            d="M5 10.5L9 14.5L15 7.5"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </motion.button>
  );
}
