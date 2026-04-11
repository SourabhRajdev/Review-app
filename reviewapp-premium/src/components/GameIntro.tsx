import { motion } from 'framer-motion';
import PrimaryButton from './PrimaryButton';

interface Props {
  round: string;
  title: string;
  subtitle: string;
  instructions: string[];
  ctaLabel: string;
  onStart: () => void;
}

export default function GameIntro({ round, title, subtitle, instructions, ctaLabel, onStart }: Props) {
  return (
    <motion.div
      className="flex-1 flex flex-col justify-center items-center text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <p className="text-caption uppercase tracking-widest text-primary font-semibold mb-2">
        {round}
      </p>
      <h2 className="text-display text-ink mb-2">{title}</h2>
      <p className="text-body-sm text-ink-secondary mb-8 max-w-[280px]">{subtitle}</p>

      <div className="rounded-card bg-surface border border-ink-ghost/20 p-5 mb-8 w-full max-w-[300px] text-left">
        <p className="text-caption text-ink-secondary mb-2 font-semibold">How to play</p>
        <ol className="text-caption text-ink-secondary space-y-1.5">
          {instructions.map((step, i) => (
            <li key={i}>{i + 1}. {step}</li>
          ))}
        </ol>
      </div>

      <PrimaryButton onClick={onStart} className="max-w-[300px]">
        {ctaLabel}
      </PrimaryButton>
    </motion.div>
  );
}
