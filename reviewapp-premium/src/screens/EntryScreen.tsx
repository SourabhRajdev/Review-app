import { motion } from 'framer-motion';
import ScreenShell from './ScreenShell';
import { useNavigation } from './useNavigation';
import { useGameStore } from '@/architecture/game/store';
import PrimaryButton from '@/components/PrimaryButton';
import { tapScale } from '@/design/motion';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';

export default function EntryScreen() {
  const go = useNavigation((s) => s.go);
  const setMode = useGameStore((s) => s.setMode);
  const resetGame = useGameStore((s) => s.reset);

  function handleVoice() {
    audio.warmup();
    audio.tap();
    haptics.press();
    go('voiceEntry');
  }

  function handleEasyMode() {
    audio.warmup();
    audio.tap();
    haptics.press();
    resetGame();
    setMode('easy');
    go('swipeGame');
  }

  function handleHardMode() {
    audio.warmup();
    audio.tap();
    haptics.press();
    resetGame();
    setMode('hard');
    go('darts');
  }

  return (
    <ScreenShell className="items-center justify-center text-center" hideProgress hideBack>
      {/* Icon */}
      <div className="w-16 h-16 rounded-2xl bg-primary-muted flex items-center justify-center mb-6">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#B8622D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" />
          <path d="M6 1v3M10 1v3M14 1v3" />
        </svg>
      </div>

      <h1 className="text-display text-ink mb-2">How was your visit?</h1>
      <p className="text-body-sm text-ink-secondary mb-8">
        Share your experience — play games, win offers.
      </p>

      {/* Voice button */}
      <PrimaryButton onClick={handleVoice} variant="secondary" className="max-w-[320px] mb-6">
        <span className="flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          Use Voice
        </span>
      </PrimaryButton>

      {/* Divider */}
      <div className="flex items-center gap-3 w-full max-w-[320px] mb-6">
        <div className="flex-1 h-px bg-ink-ghost/30" />
        <span className="text-micro text-ink-tertiary uppercase tracking-widest">or play for offers</span>
        <div className="flex-1 h-px bg-ink-ghost/30" />
      </div>

      {/* Easy / Hard mode cards */}
      <div className="w-full max-w-[320px] grid grid-cols-2 gap-3">
        <motion.button
          className="rounded-card bg-surface border border-ink-ghost/20 p-5 cursor-pointer text-center shadow-card hover:shadow-elevated transition-shadow duration-200"
          whileTap={tapScale.whileTap}
          onClick={handleEasyMode}
        >
          <div className="w-12 h-12 rounded-button bg-success/10 flex items-center justify-center mx-auto mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" />
            </svg>
          </div>
          <p className="text-body-sm font-semibold text-ink mb-0.5">Easy</p>
          <p className="text-micro text-ink-tertiary">6 quick rounds</p>
        </motion.button>

        <motion.button
          className="rounded-card bg-surface border border-ink-ghost/20 p-5 cursor-pointer text-center shadow-card hover:shadow-elevated transition-shadow duration-200"
          whileTap={tapScale.whileTap}
          onClick={handleHardMode}
        >
          <div className="w-12 h-12 rounded-button bg-primary-muted flex items-center justify-center mx-auto mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#B8622D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <p className="text-body-sm font-semibold text-ink mb-0.5">Hard</p>
          <p className="text-micro text-ink-tertiary">4 skill games</p>
        </motion.button>
      </div>

      <p className="mt-6 mb-8 text-micro text-ink-tertiary">
        Play games to unlock discounts on your next visit
      </p>
    </ScreenShell>
  );
}
