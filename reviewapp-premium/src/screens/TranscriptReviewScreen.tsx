import { motion } from 'framer-motion';
import ScreenShell from './ScreenShell';
import { useNavigation } from './useNavigation';
import { useTranscriptStore } from './transcriptStore';
import { useReviewStore } from './reviewStore';
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
    if (useAI) go('generating');
    else { setReview(transcript); go('review'); }
  }

  return (
    <ScreenShell hideProgress>
      <h2 className="text-display text-ink mb-2 mt-6">Your transcript</h2>
      <p className="text-body-sm text-ink-secondary mb-6">Edit if needed, then choose how to use it</p>

      <motion.textarea
        className="w-full bg-surface rounded-card p-5 text-body leading-relaxed text-ink resize-none border border-ink-ghost/20 outline-none focus:ring-2 focus:ring-primary/30 min-h-[180px] mb-6 shadow-card"
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        spellCheck={false}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />

      {/* AI Toggle */}
      <div className="bg-surface rounded-card p-5 shadow-card border border-ink-ghost/20 mb-6">
        <div className="flex gap-3 mb-4">
          <button
            className={`flex-1 rounded-button p-4 border-2 transition-all cursor-pointer ${
              useAI ? 'border-primary bg-primary-muted' : 'border-ink-ghost/20 bg-surface-secondary'
            }`}
            onClick={() => { setUseAI(true); audio.tick(); haptics.tick(); }}
          >
            <div className="flex items-center justify-center mb-2">
              <svg className={`w-5 h-5 ${useAI ? 'text-primary' : 'text-ink-tertiary'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <p className={`text-body-sm font-semibold mb-0.5 ${useAI ? 'text-ink' : 'text-ink-tertiary'}`}>Polish with AI</p>
            <p className={`text-caption ${useAI ? 'text-ink-secondary' : 'text-ink-tertiary'}`}>SEO-optimized review</p>
          </button>

          <button
            className={`flex-1 rounded-button p-4 border-2 transition-all cursor-pointer ${
              !useAI ? 'border-primary bg-primary-muted' : 'border-ink-ghost/20 bg-surface-secondary'
            }`}
            onClick={() => { setUseAI(false); audio.tick(); haptics.tick(); }}
          >
            <div className="flex items-center justify-center mb-2">
              <svg className={`w-5 h-5 ${!useAI ? 'text-primary' : 'text-ink-tertiary'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <p className={`text-body-sm font-semibold mb-0.5 ${!useAI ? 'text-ink' : 'text-ink-tertiary'}`}>Keep as is</p>
            <p className={`text-caption ${!useAI ? 'text-ink-secondary' : 'text-ink-tertiary'}`}>Your exact words</p>
          </button>
        </div>

        <div className="bg-surface-secondary rounded-button p-3">
          <p className="text-caption text-ink-secondary leading-relaxed">
            {useAI ? (
              <><span className="font-semibold text-primary">AI mode:</span> We'll extract key details and craft a Google-optimized 3-sentence review.</>
            ) : (
              <><span className="font-semibold text-ink">Raw mode:</span> Your transcript will be used exactly as spoken.</>
            )}
          </p>
        </div>
      </div>

      <PrimaryButton onClick={handleContinue}>Continue</PrimaryButton>

      <button
        className="w-full text-body-sm text-ink-tertiary mt-3 mb-8 cursor-pointer"
        onClick={() => go('voiceEntry')}
      >
        Record again
      </button>
    </ScreenShell>
  );
}
