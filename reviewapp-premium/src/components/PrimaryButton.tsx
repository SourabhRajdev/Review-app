// Warm gradient primary CTA button used across all screens.

import { motion } from 'framer-motion';
import { spring, tapScale } from '@/design/motion';

interface Props {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export default function PrimaryButton({ children, onClick, disabled = false, className = '' }: Props) {
  return (
    <motion.button
      className={`
        w-full rounded-2xl px-8 py-[18px] text-[17px] font-semibold text-white
        shadow-card-lg cursor-pointer transition-all duration-200
        ${disabled
          ? 'bg-ink-ghost pointer-events-none'
          : 'bg-gradient-brand hover:shadow-card-warm active:shadow-card'
        }
        ${className}
      `}
      whileTap={!disabled ? tapScale.whileTap : undefined}
      onClick={onClick}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring.gentle, delay: 0.3 }}
    >
      {children}
    </motion.button>
  );
}
