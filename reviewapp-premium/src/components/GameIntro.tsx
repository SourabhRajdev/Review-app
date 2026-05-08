import { motion } from 'framer-motion';
import PrimaryButton from './PrimaryButton';
import { spotlightHandlers, SpotlightOverlay } from './ui/spotlight-card';

interface Props {
  round: string; title: string; subtitle: string;
  instructions: string[]; ctaLabel: string; onStart: () => void;
}

export default function GameIntro({ round, title, subtitle, instructions, ctaLabel, onStart }: Props) {
  return (
    <motion.div
      className="flex-1 flex flex-col justify-center items-center text-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <p className="text-label uppercase tracking-widest text-primary font-semibold mb-3">{round}</p>
      <h2 className="text-display text-ink mb-2">{title}</h2>
      <p className="text-body-sm text-ink-secondary mb-8 max-w-[280px]">{subtitle}</p>

      <div
        {...spotlightHandlers()}
        className="relative overflow-hidden rounded-card p-5 mb-8 w-full max-w-[300px] text-left"
        style={{
          background: '#FFFFFF',
          border: '1px solid rgba(200,170,140,0.2)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 20px rgba(0,0,0,0.07)',
        }}
      >
        <SpotlightOverlay color="coffee" size={160} />
        <p className="text-label text-primary uppercase tracking-wider mb-3">How to play</p>
        <ol className="text-body-sm text-ink-secondary space-y-2">
          {instructions.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="text-primary font-bold shrink-0">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <PrimaryButton onClick={onStart} className="max-w-[300px]">{ctaLabel}</PrimaryButton>
    </motion.div>
  );
}
