// TRANSCRIPT REVIEW SCREEN
// Shows transcript with AI toggle: Polish with AI vs Keep as is

import { motion } from 'framer-motion';
import ScreenShell from './ScreenShell';
import { useNavigation } from './useNavigation';
import { useTranscriptStore } from './transcriptStore';
import { useReviewStore } from './reviewStore';
import { spring } from '@/design/motion';
import PrimaryButton from '@/components/PrimaryButton';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';

export default function TranscriptReviewScreen() {
  const go = useNavigation((s) => s.go);
  const transcript = useTranscriptStore((s) => s.transcript);
  const useAI = useTranscriptStore((s) => s.useAI);
  const setUseAI = useTranscriptStore((s) => s.setUseAI);
  const setTranscript = useTranscriptStore((s) => s.setTranscript);
  const setReview = useReviewStore((s) => s.setReview);

  function handleContinue() {
    audio.tap();
    haptics.press();
    if (useAI) {
      go('generating');
    } else {
      setReview(transcript);
      go('review');
    }
  }

  return (
    <ScreenShell hideProgress>
      <motion.h2
        className="text-[28px] font-bold font-display text-ink mb-3 mt-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring.gentle}
      >
        Your transcript
      </motion.h2>
      <motion.p
        className="text-[15px] text-ink-muted mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        Edit if needed, then choose how to use it
      </motion.p>

      {/* Editable transcript */}
      <motion.textarea
        className="w-full bg-white rounded-2xl p-5 text-[15px] leading-relaxed text-ink font-body resize-none border border-ink-ghost/10 outline-none focus:ring-2 focus:ring-brand/30 min-h-[180px] mb-6 shadow-card"
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        spellCheck={false}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring.gentle, delay: 0.3 }}
      />

      {/* AI Toggle */}
      <motion.div
        className="bg-white rounded-2xl p-5 shadow-card border border-ink-ghost/10 mb-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring.gentle, delay: 0.4 }}
      >
        <div className="flex gap-3 mb-4">
          <button
            className={`flex-1 rounded-xl p-4 border-2 transition-all cursor-pointer ${
              useAI
                ? 'border-brand bg-brand/5'
                : 'border-surface-sunken bg-surface-raised'
            }`}
            onClick={() => { setUseAI(true); audio.tick(); haptics.tick(); }}
          >
            <div className="flex items-center justify-center mb-2">
              <svg className={`w-6 h-6 ${useAI ? 'text-brand' : 'text-ink-quiet'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <p className={`text-[14px] font-semibold mb-1 ${useAI ? 'text-ink' : 'text-ink-muted'}`}>
              Polish with AI
            </p>
            <p className={`text-[12px] ${useAI ? 'text-ink-muted' : 'text-ink-quiet'}`}>
              SEO-optimized review
            </p>
          </button>

          <button
            className={`flex-1 rounded-xl p-4 border-2 transition-all cursor-pointer ${
              !useAI
                ? 'border-brand bg-brand/5'
                : 'border-surface-sunken bg-surface-raised'
            }`}
            onClick={() => { setUseAI(false); audio.tick(); haptics.tick(); }}
          >
            <div className="flex items-center justify-center mb-2">
              <svg className={`w-6 h-6 ${!useAI ? 'text-brand' : 'text-ink-quiet'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <p className={`text-[14px] font-semibold mb-1 ${!useAI ? 'text-ink' : 'text-ink-muted'}`}>
              Keep as is
            </p>
            <p className={`text-[12px] ${!useAI ? 'text-ink-muted' : 'text-ink-quiet'}`}>
              Your exact words
            </p>
          </button>
        </div>

        <div className="bg-surface-sunken rounded-xl p-3">
          <p className="text-[13px] text-ink-muted leading-relaxed">
            {useAI ? (
              <>
                <span className="font-semibold text-brand">AI mode:</span> We'll extract key details and craft a Google-optimized 3-sentence review.
              </>
            ) : (
              <>
                <span className="font-semibold text-ink">Raw mode:</span> Your transcript will be used exactly as spoken.
              </>
            )}
          </p>
        </div>
      </motion.div>

      <PrimaryButton onClick={handleContinue}>
        Continue
      </PrimaryButton>

      <motion.button
        className="w-full text-[14px] text-ink-muted mt-3 mb-8 cursor-pointer"
        onClick={() => go('voiceEntry')}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        Record again
      </motion.button>
    </ScreenShell>
  );
}
