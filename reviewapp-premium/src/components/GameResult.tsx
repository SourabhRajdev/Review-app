import { motion } from 'framer-motion';
import PrimaryButton from './PrimaryButton';

interface Props {
  label: string;
  title: string;
  subtitle?: string;
  discount: number;
  ctaLabel: string;
  onContinue: () => void;
  children?: React.ReactNode;
}

export default function GameResult({ label, title, subtitle, discount, ctaLabel, onContinue, children }: Props) {
  return (
    <motion.div
      className="flex-1 flex flex-col items-center justify-center text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <p className="text-caption uppercase tracking-widest text-ink-tertiary font-semibold mb-1">
        {label}
      </p>
      <h2 className="text-display text-ink mb-1">{title}</h2>
      {subtitle && <p className="text-body-sm text-ink-secondary mb-4">{subtitle}</p>}

      {children}

      <div className="rounded-card bg-primary px-6 py-4 mb-6">
        <p className="text-micro text-white/70 uppercase tracking-wider mb-0.5">Earned</p>
        <p className="text-white text-3xl font-bold leading-none">
          +{discount}%
        </p>
      </div>

      <PrimaryButton onClick={onContinue} className="max-w-[300px]">
        {ctaLabel}
      </PrimaryButton>
    </motion.div>
  );
}
