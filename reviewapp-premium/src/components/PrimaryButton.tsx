import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { spotlightHandlers, SpotlightOverlay } from './ui/spotlight-card';

interface Props {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  className?: string;
}

function LoadingDots() {
  return (
    <span className="flex items-center justify-center gap-1.5" aria-hidden>
      {[0, 0.12, 0.24].map((delay, i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-current"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 0.55, repeat: Infinity, delay, ease: 'easeInOut' }}
        />
      ))}
    </span>
  );
}

export default function PrimaryButton({
  children, onClick, disabled = false, loading = false,
  icon, variant = 'primary', className = '',
}: Props) {
  const isInert = disabled || loading;

  const base = 'relative w-full rounded-button px-6 py-4 text-button transition-all duration-200 focus-visible:outline-none overflow-hidden';

  const variantStyles: Record<string, string> = {
    primary: isInert
      ? 'bg-ink-ghost/40 text-ink-ghost cursor-not-allowed'
      : 'text-white cursor-pointer font-bold',
    secondary: isInert
      ? 'bg-surface text-ink-ghost cursor-not-allowed border border-ink-ghost/40'
      : 'bg-surface text-ink cursor-pointer border border-ink-ghost/60 hover:border-primary/50 hover:text-primary',
    ghost: isInert
      ? 'text-ink-tertiary cursor-not-allowed'
      : 'text-ink-secondary cursor-pointer hover:text-ink',
    danger: isInert
      ? 'bg-error/10 text-error/40 cursor-not-allowed border border-error/20'
      : 'bg-error/10 border border-error/30 text-error cursor-pointer hover:bg-error/15',
  };

  const sl = (!isInert && (variant === 'primary' || variant === 'secondary')) ? spotlightHandlers() : {};

  return (
    <motion.button
      {...sl}
      className={`${base} ${variantStyles[variant]} ${className}`}
      style={variant === 'primary' && !isInert ? {
        background: 'linear-gradient(135deg, #E8B896 0%, #C67C4E 40%, #A05A32 75%, #8B4513 100%)',
        boxShadow: '0 4px 20px rgba(198,124,78,0.4), 0 1px 3px rgba(0,0,0,0.1)',
      } : undefined}
      whileHover={!isInert && variant === 'primary' ? {
        y: -2,
        boxShadow: '0 8px 32px rgba(198,124,78,0.5), 0 2px 6px rgba(0,0,0,0.12)',
      } : !isInert && variant === 'secondary' ? { y: -1 } : undefined}
      whileTap={!isInert ? { scale: 0.97 } : undefined}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      onClick={isInert ? undefined : onClick}
      disabled={disabled}
      aria-disabled={loading || disabled}
      aria-busy={loading}
    >
      {/* Spotlight — warm pointer-tracking radial glow */}
      {variant === 'primary' && !isInert && <SpotlightOverlay color="white" size={150} />}
      {variant === 'secondary' && !isInert && <SpotlightOverlay color="warm" size={130} />}

      {/* Shimmer sweep on primary */}
      {variant === 'primary' && !isInert && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)',
          }}
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' }}
        />
      )}
      {loading ? (
        <LoadingDots />
      ) : (
        <span className="relative z-10 flex items-center justify-center gap-2">
          {icon && <span className="shrink-0">{icon}</span>}
          {children}
        </span>
      )}
    </motion.button>
  );
}
