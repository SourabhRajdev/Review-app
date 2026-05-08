import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import PrimaryButton from './PrimaryButton';
import { spotlightHandlers, SpotlightOverlay } from './ui/spotlight-card';

interface Props {
  label: string; title: string; subtitle?: string;
  discount: number; ctaLabel: string; onContinue: () => void;
  children?: React.ReactNode;
}

export default function GameResult({ label, title, subtitle, discount, ctaLabel, onContinue, children }: Props) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    let frame = 0;
    const total = 20;
    const step = () => {
      frame++;
      setDisplayed(Math.round((frame / total) * discount));
      if (frame < total) requestAnimationFrame(step);
    };
    const id = setTimeout(() => requestAnimationFrame(step), 300);
    return () => clearTimeout(id);
  }, [discount]);

  return (
    <motion.div
      className="flex-1 flex flex-col items-center justify-center text-center"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
    >
      <p className="text-label uppercase tracking-widest text-ink-tertiary mb-1">{label}</p>
      <h2 className="text-display text-ink mb-1">{title}</h2>
      {subtitle && <p className="text-body-sm text-ink-secondary mb-6">{subtitle}</p>}

      {children}

      {/* Discount badge */}
      <motion.div
        {...spotlightHandlers()}
        className="relative rounded-card overflow-hidden mb-6 w-[220px]"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.2 }}
        style={{
          background: '#FFFFFF',
          border: '1px solid rgba(198,124,78,0.25)',
          boxShadow: '0 4px 24px rgba(198,124,78,0.2), 0 1px 6px rgba(0,0,0,0.06)',
        }}
      >
        <SpotlightOverlay color="coffee" size={140} />
        {/* Coffee gradient top bar */}
        <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, transparent, #C67C4E, transparent)' }} />
        <div className="px-8 py-5">
          <p className="text-micro text-ink-tertiary uppercase tracking-widest mb-1">Earned</p>
          <motion.p
            className="leading-none font-black text-[52px]"
            style={{ background: 'linear-gradient(135deg, #E8B896, #C67C4E)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
          >
            +{displayed}%
          </motion.p>
        </div>
        {/* Subtle warm glow */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, rgba(198,124,78,0.05) 0%, transparent 70%)' }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>

      <PrimaryButton onClick={onContinue} className="max-w-[300px]">{ctaLabel}</PrimaryButton>
    </motion.div>
  );
}
