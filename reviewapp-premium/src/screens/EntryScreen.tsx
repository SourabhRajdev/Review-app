import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import ScreenShell from './ScreenShell';
import { useNavigation } from './useNavigation';
import { useGameStore } from '@/architecture/game/store';
import { useTranscriptStore } from './transcriptStore';
import VoiceExpansion from '@/components/VoiceExpansion';
import Lamp from '@/components/ui/lamp';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';
import { spotlightHandlers, SpotlightOverlay } from '@/components/ui/spotlight-card';

// ── Tiny floating ambient dots — coffee-tinted on light bg ──
const PARTICLES = [
  { emoji: '☕', delay: 0,    dur: 3.2, x: 12  },
  { emoji: '⭐', delay: 0.6,  dur: 3.8, x: 28  },
  { emoji: '✨', delay: 1.1,  dur: 3.4, x: 50  },
  { emoji: '🏆', delay: 1.7,  dur: 3.6, x: 70  },
  { emoji: '☕', delay: 2.2,  dur: 3.1, x: 85  },
  { emoji: '✨', delay: 0.3,  dur: 3.9, x: 42  },
  { emoji: '⭐', delay: 1.4,  dur: 3.3, x: 62  },
];

function FloatingParticle({ emoji, delay, dur, x }: { emoji: string; delay: number; dur: number; x: number }) {
  return (
    <motion.span
      className="absolute text-xl pointer-events-none select-none"
      style={{ left: `${x}%`, bottom: 0 }}
      initial={{ y: 0, opacity: 0 }}
      animate={{ y: -120, opacity: [0, 0.7, 0.7, 0] }}
      transition={{ duration: dur, delay, repeat: Infinity, ease: 'easeOut' }}
    >
      {emoji}
    </motion.span>
  );
}

export default function EntryScreen() {
  const go = useNavigation((s) => s.go);
  const setMode = useGameStore((s) => s.setMode);
  const resetGame = useGameStore((s) => s.reset);
  const setTranscript = useTranscriptStore((s) => s.setTranscript);
  const [voiceActive, setVoiceActive] = useState(false);
  const [pressed, setPressed] = useState(false);

  function handleVoiceTranscript(text: string) {
    setTranscript(text);
  }

  function handleVoiceComplete() {
    go('transcriptReview');
  }

  function handleVoiceStateChange(state: 'idle' | 'recording' | 'processing' | 'done' | 'error') {
    setVoiceActive(state !== 'idle' && state !== 'error');
  }

  function handleEasyMode() {
    audio.warmup();
    audio.tap();
    haptics.press();
    resetGame();
    setMode('easy');
    go('aboutYou');
  }

  return (
    <ScreenShell className="items-center justify-center text-center pt-[160px]" hideProgress hideBack>
      <Lamp />

      {/* Subtle warm ambient dots */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
        {[
          { x: '15%', y: '20%', delay: 0, dur: 4 },
          { x: '75%', y: '35%', delay: 1.5, dur: 3.5 },
          { x: '50%', y: '70%', delay: 0.8, dur: 4.5 },
        ].map((p, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{ left: p.x, top: p.y, background: 'rgba(198,124,78,0.4)' }}
            animate={{ opacity: [0.1, 0.4, 0.1], scale: [1, 1.4, 1], y: [0, -16, 0] }}
            transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
          />
        ))}
      </div>

      {/* Coffee icon */}
      <motion.div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 relative z-10"
        style={{
          background: '#FFFFFF',
          border: '1px solid rgba(198,124,78,0.2)',
          boxShadow: '0 4px 20px rgba(198,124,78,0.15), 0 1px 4px rgba(0,0,0,0.06)',
        }}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C67C4E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" />
          <path d="M6 1v3M10 1v3M14 1v3" />
        </svg>
      </motion.div>

      <motion.h1
        className="text-display text-ink mb-2 relative z-10"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.4 }}
      >
        How was your visit?
      </motion.h1>
      <motion.p
        className="text-body-sm text-ink-secondary mb-8 relative z-10"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14, duration: 0.4 }}
      >
        Share your experience — play games, win offers.
      </motion.p>

      {/* Voice */}
      <div className="mb-6 w-full max-w-[320px] relative z-10">
        <VoiceExpansion
          onTranscript={handleVoiceTranscript}
          onComplete={handleVoiceComplete}
          onStateChange={handleVoiceStateChange}
        />
      </div>

      {/* Divider */}
      <AnimatePresence>
        {!voiceActive && (
          <motion.div
            initial={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-3 w-full max-w-[320px] mb-6 relative z-10"
          >
            <div className="flex-1 h-px" style={{ background: 'rgba(200,170,140,0.4)' }} />
            <span className="text-micro font-bold text-ink-tertiary uppercase tracking-widest">or play for offers</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(200,170,140,0.4)' }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PREMIUM PLAYER GAME BUTTON ── */}
      <AnimatePresence>
        {!voiceActive && (
          <motion.div
            className="relative w-full max-w-[320px] z-10"
            initial={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Outer glow ring — pulses continuously */}
            <motion.div
              className="absolute inset-0 rounded-[20px] pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(245,158,11,0.2) 0%, transparent 70%)',
              }}
              animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.04, 1] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            />

            <motion.button
              {...spotlightHandlers()}
              onClick={handleEasyMode}
              onPointerDown={() => setPressed(true)}
              onPointerUp={() => setPressed(false)}
              onPointerLeave={() => setPressed(false)}
              animate={{ scale: pressed ? 0.97 : 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 22 }}
              className="relative w-full rounded-[20px] overflow-hidden cursor-pointer select-none"
              style={{ padding: 0, border: 'none', background: 'none' }}
            >
              {/* Amber gradient — keeps game energy with better contrast */}
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(135deg, #FCD34D 0%, #F59E0B 40%, #D97706 70%, #B45309 100%)' }}
              />

              {/* Spotlight — white pointer glow on amber bg */}
              <SpotlightOverlay color="white" size={180} />

              {/* Animated warm overlay */}
              <motion.div
                className="absolute inset-0"
                style={{ background: 'radial-gradient(ellipse at 50% 120%, rgba(245,158,11,0.2) 0%, transparent 60%)' }}
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* Shimmer sweep */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.22) 50%, transparent 65%)',
                }}
                initial={{ x: '-100%' }}
                animate={{ x: '200%' }}
                transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 1.5, ease: 'easeInOut' }}
              />

              {/* Floating particles */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {PARTICLES.map((p, i) => (
                  <FloatingParticle key={i} {...p} />
                ))}
              </div>

              {/* Corner bracket accents */}
              <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-black/15 rounded-tl-md pointer-events-none" />
              <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-black/15 rounded-tr-md pointer-events-none" />
              <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-black/15 rounded-bl-md pointer-events-none" />
              <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-black/15 rounded-br-md pointer-events-none" />

              {/* Content */}
              <div className="relative z-10 flex flex-col items-center justify-center gap-3 px-8 py-7">
                {/* Wiggling gamepad icon */}
                <motion.div
                  animate={{ rotate: [0, 8, -8, 4, -4, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.5 }}
                >
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#1A0E08" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 6px rgba(0,0,0,0.2))' }}>
                    <line x1="6" y1="12" x2="10" y2="12" />
                    <line x1="8" y1="10" x2="8" y2="14" />
                    <circle cx="15" cy="11" r="1" fill="#1A0E08" />
                    <circle cx="17" cy="13" r="1" fill="#1A0E08" />
                    <path d="M6 9a5 5 0 00-3 8l1 1a2 2 0 002 0l1-1h8l1 1a2 2 0 002 0l1-1a5 5 0 00-3-8H6z" />
                  </svg>
                </motion.div>

                {/* Title — dark text on amber for contrast */}
                <div>
                  <motion.p
                    className="text-heading font-black tracking-tight leading-none mb-1"
                    style={{ color: '#1A0E08' }}
                  >
                    PLAYER GAME
                  </motion.p>
                  <motion.p
                    className="text-label font-semibold tracking-wide"
                    style={{ color: 'rgba(26,14,8,0.65)' }}
                    animate={{ opacity: [0.65, 0.9, 0.65] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    6 rounds · win rewards
                  </motion.p>
                </div>

                {/* Bouncing dots */}
                <div className="flex items-center gap-1.5">
                  {[0, 0.15, 0.3].map((delay, i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: 'rgba(26,14,8,0.4)' }}
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay, ease: 'easeInOut' }}
                    />
                  ))}
                </div>
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!voiceActive && (
          <motion.p
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="mt-5 mb-8 text-micro text-ink-tertiary font-medium relative z-10"
          >
            Tap to start your experience
          </motion.p>
        )}
      </AnimatePresence>
    </ScreenShell>
  );
}
