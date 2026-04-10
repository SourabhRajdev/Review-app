// VOICE ENTRY SCREEN
// Records voice using browser SpeechRecognition API (no external dependencies)

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ScreenShell from './ScreenShell';
import { useNavigation } from './useNavigation';
import { useTranscriptStore } from './transcriptStore';
import { spring, tapScale } from '@/design/motion';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';

type RecordingState = 'idle' | 'recording' | 'error';

export default function VoiceEntryScreen() {
  const go = useNavigation((s) => s.go);
  const setTranscript = useTranscriptStore((s) => s.setTranscript);
  const [state, setState] = useState<RecordingState>('idle');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [error, setError] = useState('');
  const recognitionRef = useRef<any>(null);

  function startRecording() {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setError('Speech recognition not supported. Please use Chrome, Edge, or Safari.');
        setState('error');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      let finalText = '';

      recognition.onstart = () => {
        setState('recording');
        setLiveTranscript('');
        audio.tap();
        haptics.press();
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalText += transcript + ' ';
          } else {
            interim += transcript;
          }
        }
        setLiveTranscript((finalText + interim).trim());
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech' && (recognitionRef.current as any)?.isManualStop) return;
        setError(`Speech recognition error: ${event.error}. Please try again.`);
        setState('error');
      };

      recognition.onend = () => {
        const final = finalText.trim();
        if (final) {
          setTranscript(final);
          audio.bullseye();
          haptics.impact();
          go('transcriptReview');
        } else if (!(recognitionRef.current as any)?.isManualStop) {
          try { recognition.start(); } catch {
            setError('Recording stopped unexpectedly. Please try again.');
            setState('error');
          }
        } else {
          setError('No speech detected. Please try again.');
          setState('error');
        }
      };

      recognitionRef.current = recognition;
      (recognitionRef.current as any).isManualStop = false;
      recognition.start();
    } catch {
      setError('Could not start speech recognition. Please check permissions.');
      setState('error');
    }
  }

  function stopRecording() {
    if (recognitionRef.current) {
      try {
        (recognitionRef.current as any).isManualStop = true;
        recognitionRef.current.stop();
      } catch {}
    }
  }

  function reset() {
    setState('idle');
    setLiveTranscript('');
    setError('');
  }

  return (
    <ScreenShell className="items-center justify-center text-center" hideProgress hero>
      <AnimatePresence mode="wait">
        {state === 'idle' && (
          <motion.div
            key="idle"
            className="flex flex-col items-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={spring.gentle}
          >
            <motion.div
              className="w-28 h-28 rounded-full bg-brand/10 flex items-center justify-center mb-8"
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            >
              <svg className="w-14 h-14 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </motion.div>

            <h2 className="text-[28px] font-bold font-display text-ink mb-3">
              Tell us about your visit
            </h2>
            <p className="text-[15px] text-ink-muted mb-8 max-w-[300px]">
              Speak naturally for 15-30 seconds. Mention what you ordered and how it was.
            </p>

            <motion.button
              className="w-full max-w-[280px] rounded-2xl bg-gradient-brand px-8 py-[18px] text-[17px] font-semibold text-white shadow-card-warm cursor-pointer"
              whileTap={tapScale.whileTap}
              onClick={startRecording}
            >
              Start Recording
            </motion.button>

            <motion.button
              className="mt-4 text-[14px] text-ink-muted cursor-pointer"
              onClick={() => go('entry')}
            >
              Use tap interface instead
            </motion.button>
          </motion.div>
        )}

        {state === 'recording' && (
          <motion.div
            key="recording"
            className="flex flex-col items-center w-full"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={spring.gentle}
          >
            {/* Pulsing recording indicator */}
            <div className="relative w-28 h-28 mb-8">
              <motion.div
                className="absolute inset-0 rounded-full bg-brand-bad/20"
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              />
              <motion.div
                className="absolute inset-0 rounded-full bg-brand-bad flex items-center justify-center"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <div className="w-8 h-8 rounded-sm bg-white" />
              </motion.div>
            </div>

            <h2 className="text-[28px] font-bold font-display text-ink mb-3">
              Listening...
            </h2>
            <p className="text-[15px] text-ink-muted mb-6">
              Speak naturally about your experience
            </p>

            {liveTranscript && (
              <motion.div
                className="w-full max-w-[360px] bg-white rounded-2xl p-5 mb-6 max-h-[200px] overflow-y-auto shadow-card border border-ink-ghost/10"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <p className="text-[14px] text-ink leading-relaxed text-left">
                  {liveTranscript}
                </p>
              </motion.div>
            )}

            <motion.button
              className="w-full max-w-[280px] rounded-2xl bg-ink px-8 py-[18px] text-[17px] font-semibold text-white shadow-card-lg cursor-pointer"
              whileTap={tapScale.whileTap}
              onClick={stopRecording}
            >
              Done Recording
            </motion.button>
          </motion.div>
        )}

        {state === 'error' && (
          <motion.div
            key="error"
            className="flex flex-col items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="w-28 h-28 rounded-full bg-brand-bad/10 flex items-center justify-center mb-8">
              <svg className="w-14 h-14 text-brand-bad" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>

            <h2 className="text-[28px] font-bold font-display text-ink mb-3">
              Something went wrong
            </h2>
            <p className="text-[15px] text-ink-muted mb-8 max-w-[300px]">
              {error}
            </p>

            <motion.button
              className="w-full max-w-[280px] rounded-2xl bg-gradient-brand px-8 py-[18px] text-[17px] font-semibold text-white shadow-card-warm cursor-pointer"
              whileTap={tapScale.whileTap}
              onClick={reset}
            >
              Try Again
            </motion.button>

            <motion.button
              className="mt-4 text-[14px] text-ink-muted cursor-pointer"
              onClick={() => go('entry')}
            >
              Use tap interface instead
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </ScreenShell>
  );
}
