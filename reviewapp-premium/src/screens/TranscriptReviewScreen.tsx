import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useNavigation } from './useNavigation';
import { useTranscriptStore } from './transcriptStore';
import { useReviewStore } from './reviewStore';
import PrimaryButton from '@/components/PrimaryButton';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';
import { pageSlide } from '@/design/motion';

const MIN_WORDS = 5;

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(w => w.length > 1).length;
}

export default function TranscriptReviewScreen() {
  const go = useNavigation((s) => s.go);
  const back = useNavigation((s) => s.back);
  const transcript = useTranscriptStore((s) => s.transcript);
  const setTranscript = useTranscriptStore((s) => s.setTranscript);
  const setReview = useReviewStore((s) => s.setReview);
  const [isEditing, setIsEditing] = useState(false);
  const [localTranscript, setLocalTranscript] = useState('');
  const [hint, setHint] = useState('');

  useEffect(() => {
    if (transcript && transcript.trim().length > 0) {
      setLocalTranscript(transcript);
    }
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
    go('review');
  }

  function handleEdit() {
    audio.tap();
    haptics.press();
    setHint('');
    setIsEditing(true);
  }

  function handleSaveEdit(newText: string) {
    audio.tap();
    haptics.press();
    setLocalTranscript(newText);
    setTranscript(newText);
    setIsEditing(false);
  }

  const displayText = localTranscript || transcript || 'No transcript available';
  const tooShort = wordCount(displayText) < MIN_WORDS;

  return (
    <motion.div
      className="fixed inset-0 bg-bg flex items-center justify-center px-5"
      variants={pageSlide}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-display text-ink mb-2">Your Review</h1>
          <p className="text-body-sm text-ink-secondary">
            Polish with AI or keep as is
          </p>
        </div>

        {/* Transcript Display / Edit */}
        <div className="mb-6">
          {isEditing ? (
            <div className="space-y-4">
              <textarea
                className="w-full h-48 p-4 rounded-card bg-surface border border-ink-ghost text-ink text-body resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={localTranscript}
                onChange={(e) => setLocalTranscript(e.target.value)}
                autoFocus
              />
              <button
                onClick={() => handleSaveEdit(localTranscript)}
                className="w-full text-button text-primary font-medium"
              >
                Save Changes
              </button>
            </div>
          ) : (
            <motion.div
              className="p-6 rounded-card bg-surface border border-ink-ghost shadow-card"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className="text-body text-ink leading-relaxed mb-4">
                {displayText}
              </p>
              <button
                onClick={handleEdit}
                className="text-micro text-primary font-medium"
              >
                Edit
              </button>
            </motion.div>
          )}
        </div>

        {/* Inline hint — shown when transcript is too short or an error occurred */}
        <AnimatePresence>
          {hint && (
            <motion.p
              key="hint"
              className="text-body-sm text-ink-secondary text-center mb-4"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {hint}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        {!isEditing && (
          <div className="space-y-3">
            <PrimaryButton onClick={handlePolishWithAI} disabled={tooShort}>
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Polish with AI
              </span>
            </PrimaryButton>

            {tooShort && (
              <p className="text-micro text-ink-tertiary text-center -mt-1">
                Say a bit more — what did you have, where, and how was it?
              </p>
            )}

            <button
              onClick={handleKeepAsIs}
              className="w-full py-3.5 rounded-button text-button text-ink font-medium border border-ink-ghost bg-surface hover:bg-ink-ghost/5 transition-colors"
            >
              Keep as is
            </button>

            <button
              onClick={back}
              className="w-full py-3 text-micro text-ink-tertiary hover:text-ink-secondary transition-colors"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
