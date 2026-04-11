import { motion } from 'framer-motion';
import { tapScale } from '@/design/motion';

interface Props {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  className?: string;
}

export default function PrimaryButton({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  className = '',
}: Props) {
  const base = 'w-full rounded-button px-6 py-3.5 text-button cursor-pointer transition-colors duration-150';

  const variants = {
    primary: disabled
      ? 'bg-ink-ghost text-ink-tertiary pointer-events-none'
      : 'bg-primary text-white active:bg-primary-light',
    secondary: disabled
      ? 'bg-surface-secondary text-ink-tertiary pointer-events-none'
      : 'bg-surface border border-ink-ghost text-ink active:bg-surface-secondary',
    ghost: disabled
      ? 'text-ink-tertiary pointer-events-none'
      : 'text-ink-secondary active:text-ink',
  };

  return (
    <motion.button
      className={`${base} ${variants[variant]} ${className}`}
      whileTap={!disabled ? tapScale.whileTap : undefined}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </motion.button>
  );
}
