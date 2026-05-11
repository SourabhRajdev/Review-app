import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import ScreenShell from './ScreenShell';
import { useNavigation } from './useNavigation';
import { useTranscriptStore } from './transcriptStore';
import { useReviewStore } from './reviewStore';
import PrimaryButton from '@/components/PrimaryButton';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';
import { spring } from '@/design/motion';

const MIN_WORDS = 5;

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(w => w.length > 1).length;
}

export default function TranscriptReviewScreen() {
  const go = useNavigation((s) => s.go);
  const transcript = useTranscriptStore((s) => s.transcript);
  const setTranscript = useTranscriptStore((s) => s.setTranscript);
  const setReview = useReviewStore((s) => s.setReview);
  
  const [isEditing, setIsEditing] = useState(false);
  const [localTranscript, setLocalTranscript] = useState('');
  const [hint, setHint] = useState('');

  useEffect(() => {
    if (!transcript || transcript.trim().length === 0) {
      // If no transcript, we might be here by mistake
      return;
    }
    setLocalTranscript(transcript);
  }, [transcript]);

  function handlePolishWithAI() {
    const textToUse = localTranscript || transcript;

    if (!textToUse || textToUse.trim().length === 0) {
      setHint('Nothing to polish — try recording again.');
      return;
    }

    if (wordCount(textToUse) < MIN_WORDS) {
      setHint('Say a bit more — what did you have, where, and how was it?');
      haptics.tick();
      return;
    }

    setHint('');
    audio.tap();
    haptics.press();
    setTranscript(textToUse);
    go('generating');
  }

  function handleKeepAsIs() {
    const textToUse = localTranscript || transcript;

    if (!textToUse || textToUse.trim().length === 0) {
      setHint('Nothing to keep — try recording again.');
      return;
    }

    setHint('');
    audio.tap();
    haptics.press();
    setReview(textToUse);
    
    // Copy to clipboard DIRECTLY in user gesture — only way it works
    navigator.clipboard.writeText(textToUse).catch(() => {
      // Silently fail if clipboard blocked
    });
    
    go('review');
  }

  function handleEdit() {
    audio.tap();
    haptics.press();
    setHint('');
    setIsEditing(true);
  }

  function handleSaveEdit() {
    audio.tap();
    haptics.press();
    setTranscript(localTranscript);
    setIsEditing(false);
  }

  const displayText = localTranscript || transcript || 'No transcript available';
  const tooShort = wordCount(displayText) < MIN_WORDS;

  return (
    <ScreenShell hideProgress>
      <div className="flex-1 flex flex-col pt-8">
        <div className="text-center mb-8">
          <motion.div 
            className="inline-flex items-center gap-2 text-primary px-4 py-1.5 rounded-full text-label font-semibold mb-3"
            style={{ background: 'rgba(198,124,78,0.1)', border: '1px solid rgba(198,124,78,0.2)' }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            🎤 Voice Captured
          </motion.div>
          <h1 className="text-display text-ink mb-2">Review Ready</h1>
          <p className="text-body text-ink-secondary">
            Polish with AI or keep it as is
          </p>
        </div>

        <div className="mb-8">
          {isEditing ? (
            <motion.div 
              className="space-y-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={spring.snappy}
            >
              <textarea
                className="w-full h-48 p-5 rounded-2xl bg-surface-secondary border-2 border-primary/20 text-ink text-body resize-none focus:outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/5 transition-all shadow-sunken"
                value={localTranscript}
                onChange={(e) => setLocalTranscript(e.target.value)}
                autoFocus
              />
              <button
                onClick={handleSaveEdit}
                className="w-full py-4 rounded-xl text-label text-primary font-bold bg-white border border-primary/20 shadow-sm hover:shadow-md active:scale-95 transition-all"
              >
                Save Changes
              </button>
            </motion.div>
          ) : (
            <motion.div
              className="p-6 rounded-[24px] bg-white border border-ink-ghost shadow-card relative group"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={spring.gentle}
            >
              <p className="text-body text-ink leading-relaxed mb-6 italic">
                "{displayText}"
              </p>
              <button
                onClick={handleEdit}
                className="flex items-center gap-1.5 text-micro text-primary font-bold uppercase tracking-wider opacity-60 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit Text
              </button>
            </motion.div>
          )}
        </div>

        <AnimatePresence>
          {hint && (
            <motion.p
              key="hint"
              className="text-micro text-error font-semibold text-center mb-4"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {hint}
            </motion.p>
          )}
        </AnimatePresence>

        {!isEditing && (
          <div className="mt-auto space-y-4 pb-8">
            <PrimaryButton onClick={handlePolishWithAI}>
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Polish with AI
              </span>
            </PrimaryButton>

            {tooShort && (
              <p className="text-micro text-ink-tertiary text-center !mt-2">
                Note: Short reviews may lack detail for AI polishing
              </p>
            )}

            <button
              onClick={handleKeepAsIs}
              className="w-full py-4 rounded-full text-label text-ink font-bold border-2 border-ink-ghost bg-white hover:bg-surface-secondary active:scale-[0.98] transition-all"
            >
              Keep as is
            </button>
          </div>
        )}
      </div>
    </ScreenShell>
  );
}
