import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import ScreenShell from './ScreenShell';
import { useNavigation } from './useNavigation';
import { useGameStore } from '@/architecture/game/store';
import { useTranscriptStore } from './transcriptStore';
import VoiceExpansion from '@/components/VoiceExpansion';
import { tapScale } from '@/design/motion';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';

export default function EntryScreen() {
  const go = useNavigation((s) => s.go);
  const setMode = useGameStore((s) => s.setMode);
  const resetGame = useGameStore((s) => s.reset);
  const setTranscript = useTranscriptStore((s) => s.setTranscript);
  const [voiceActive, setVoiceActive] = useState(false);

  function handleVoiceTranscript(text: string) {
    console.log('📥 [EntryScreen] ========== TRANSCRIPT RECEIVED ==========');
    console.log('📥 [EntryScreen] Text:', text);
    console.log('📥 [EntryScreen] Length:', text.length);
    
    setTranscript(text);
    
    // Verify it was stored immediately
    const stored = useTranscriptStore.getState().transcript;
    console.log('✅ [EntryScreen] Verified stored in store:', stored);
    console.log('✅ [EntryScreen] Store length:', stored.length);
  }

  function handleVoiceComplete() {
    console.log('🚀 [EntryScreen] ========== VOICE COMPLETE ==========');
    
    // Log transcript RIGHT BEFORE navigation
    const currentTranscript = useTranscriptStore.getState().transcript;
    console.log('📤 [EntryScreen] Transcript BEFORE navigation:', currentTranscript);
    console.log('📤 [EntryScreen] Length BEFORE navigation:', currentTranscript?.length || 0);
    
    console.log('🚀 [EntryScreen] Calling go("transcriptReview")');
    go('transcriptReview');
  }

  function handleVoiceStateChange(state: 'idle' | 'expanding' | 'listening' | 'processing' | 'done' | 'error') {
    // Hide cards when voice interaction starts (but not on error or idle)
    setVoiceActive(state !== 'idle' && state !== 'error');
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

      {/* Voice expansion component */}
      <div className="mb-6">
        <VoiceExpansion 
          onTranscript={handleVoiceTranscript}
          onComplete={handleVoiceComplete}
          onStateChange={handleVoiceStateChange}
        />
      </div>

      {/* Divider - fade out when voice active */}
      <AnimatePresence>
        {!voiceActive && (
          <motion.div
            initial={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-3 w-full max-w-[320px] mb-6"
          >
            <div className="flex-1 h-px bg-ink-ghost/30" />
            <span className="text-micro text-ink-tertiary uppercase tracking-widest">or play for offers</span>
            <div className="flex-1 h-px bg-ink-ghost/30" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Easy / Hard mode cards - fade out and collapse when voice active */}
      <AnimatePresence>
        {!voiceActive && (
          <motion.div
            initial={{ opacity: 1, height: 'auto' }}
            exit={{ 
              opacity: 0, 
              height: 0,
              marginBottom: 0,
            }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[320px] grid grid-cols-2 gap-3"
          >
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer text - fade out when voice active */}
      <AnimatePresence>
        {!voiceActive && (
          <motion.p
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="mt-6 mb-8 text-micro text-ink-tertiary"
          >
            Play games to unlock discounts on your next visit
          </motion.p>
        )}
      </AnimatePresence>
    </ScreenShell>
  );
}
