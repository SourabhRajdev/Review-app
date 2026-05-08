import { motion, AnimatePresence } from 'framer-motion';
import { spotlightHandlers, SpotlightOverlay } from './ui/spotlight-card';

interface Props {
  label: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export default function AnimatedChip({ label, selected, onClick, disabled = false }: Props) {
  const sl = !disabled ? spotlightHandlers() : {};

  return (
    <motion.button
      {...sl}
      onClick={onClick}
      disabled={disabled}
      className="relative inline-flex items-center gap-1.5 px-4 py-2.5 rounded-chip text-label font-semibold transition-colors cursor-pointer select-none"
      style={selected ? {
        background: '#FFF8F3',
        border: '1.5px solid rgba(198,124,78,0.5)',
        color: '#C67C4E',
        boxShadow: '0 0 0 3px rgba(198,124,78,0.1)',
      } : disabled ? {
        background: '#F5F0EC',
        border: '1px solid rgba(200,170,140,0.15)',
        color: '#D8C8BB',
        cursor: 'not-allowed',
      } : {
        background: '#FFFFFF',
        border: '1px solid rgba(200,170,140,0.25)',
        color: '#7A5C4A',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
      whileTap={!disabled ? { scale: 0.95 } : undefined}
      animate={{ scale: selected ? 1.02 : 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    >
      <SpotlightOverlay color={selected ? 'coffee' : 'warm'} size={90} />
      <AnimatePresence>
        {selected && (
          <motion.svg
            key="check"
            width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
          >
            <path d="M5 13l4 4L19 7" />
          </motion.svg>
        )}
      </AnimatePresence>
      {label}
    </motion.button>
  );
}
