// ENTRY SCREEN
// Premium hero landing. Warm gradient, animated coffee cup illustration,
// serif heading, two CTAs. Unlocks AudioContext on first tap.

import { motion } from 'framer-motion';
import ScreenShell from './ScreenShell';
import { useNavigation } from './useNavigation';
import { spring, tapScale } from '@/design/motion';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';

// Minimal coffee cup SVG illustration — centered with aligned steam
function CoffeeCupIcon() {
  return (
    <motion.div
      className="relative mx-auto mb-6"
      style={{ width: 100, height: 100 }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ...spring.bouncy, delay: 0.1 }}
    >
      <svg viewBox="0 0 100 100" fill="none" className="w-full h-full overflow-visible">
        {/* Steam — centered above the cup body (cup center = 42) */}
        {[0, 1, 2].map((i) => (
          <motion.line
            key={i}
            x1={30 + i * 12}
            y1={24}
            x2={30 + i * 12}
            y2={10}
            stroke="#C67C4E"
            strokeWidth="3"
            strokeLinecap="round"
            strokeOpacity={0.25}
            animate={{
              y1: [24, 20, 24],
              y2: [10, 4, 10],
              strokeOpacity: [0.15, 0.35, 0.15]
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              delay: i * 0.35,
              ease: 'easeInOut'
            }}
          />
        ))}

        {/* Cup body — centered at x=42, leaving room for handle on right */}
        <motion.rect
          x="18" y="30" width="48" height="44" rx="8"
          fill="#C67C4E"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...spring.gentle, delay: 0.2 }}
        />

        {/* Handle */}
        <motion.path
          d="M66 40 C78 40, 78 64, 66 64"
          stroke="#C67C4E"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        />

        {/* Saucer */}
        <motion.ellipse
          cx="42" cy="78" rx="36" ry="5"
          fill="#E8A87C"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ ...spring.gentle, delay: 0.4 }}
        />

        {/* Latte art dot */}
        <motion.circle
          cx="42" cy="42" r="7"
          fill="#FEF3C7"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ ...spring.bouncy, delay: 0.7 }}
        />
      </svg>
    </motion.div>
  );
}

export default function EntryScreen() {
  const go = useNavigation((s) => s.go);

  function handleStart() {
    audio.warmup();
    audio.tap();
    haptics.press();
    go('visitType');
  }

  function handleVoice() {
    audio.warmup();
    audio.tap();
    haptics.press();
    go('voiceEntry');
  }

  return (
    <ScreenShell className="items-center justify-center text-center" hideProgress hideBack hero>
      <CoffeeCupIcon />

      {/* Heading — serif for warmth */}
      <motion.h1
        className="text-[34px] font-bold font-display tracking-tight leading-[1.1] text-ink"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring.gentle, delay: 0.25 }}
      >
        How was your visit?
      </motion.h1>

      <motion.p
        className="mt-3 text-[16px] text-ink-muted leading-relaxed font-body"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.45 }}
      >
        Share your experience in under a minute.
      </motion.p>

      {/* Primary CTA */}
      <motion.button
        className="mt-10 w-full max-w-[300px] rounded-2xl bg-gradient-brand px-8 py-[18px] text-[17px] font-semibold text-white shadow-card-warm cursor-pointer active:shadow-card"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring.gentle, delay: 0.6 }}
        whileTap={tapScale.whileTap}
        onClick={handleStart}
      >
        Get Started
      </motion.button>

      {/* Voice Option */}
      <motion.button
        className="mt-3 w-full max-w-[300px] rounded-2xl bg-white/80 border border-brand/15 px-8 py-[16px] text-[16px] font-semibold text-brand shadow-card cursor-pointer flex items-center justify-center gap-2.5"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring.gentle, delay: 0.75 }}
        whileTap={tapScale.whileTap}
        onClick={handleVoice}
      >
        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
        Use Voice Instead
      </motion.button>

      {/* Subtle tagline */}
      <motion.p
        className="mt-8 text-[12px] text-ink-quiet"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        Your review helps others discover great spots
      </motion.p>
    </ScreenShell>
  );
}
