import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ScreenShell from './ScreenShell';
import { useNavigation } from './useNavigation';
import { useTranscriptStore } from './transcriptStore';
import PrimaryButton from '@/components/PrimaryButton';
import { tapScale } from '@/design/motion';
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

      recognition.onstart = () => { setState('recording'); setLiveTranscript(''); audio.tap(); haptics.press(); };
      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalText += t + ' ';
          else interim += t;
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
        if (final) { setTranscript(final); audio.bullseye(); haptics.impact(); go('transcriptReview'); }
        else if (!(recognitionRef.current as any)?.isManualStop) {
          try { recognition.start(); } catch { setError('Recording stopped unexpectedly.'); setState('error'); }
        } else { setError('No speech detected. Please try again.'); setState('error'); }
      };

      recognitionRef.current = recognition;
      (recognitionRef.current as any).isManualStop = false;
      recognition.start();
    } catch { setError('Could not start speech recognition.'); setState('error'); }
  }

  function stopRecording() {
    if (recognitionRef.current) {
      try { (recognitionRef.current as any).isManualStop = true; recognitionRef.current.stop(); } catch {}
    }
  }

  function reset() { setState('idle'); setLiveTranscript(''); setError(''); }

  return (
    <ScreenShell className="items-center justify-center text-center" hideProgress>
      <AnimatePresence mode="wait">
        {state === 'idle' && (
          <motion.div key="idle" className="flex flex-col items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="w-20 h-20 rounded-full bg-primary-muted flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h2 className="text-display text-ink mb-2">Tell us about your visit</h2>
            <p className="text-body-sm text-ink-secondary mb-8 max-w-[300px]">
              Speak naturally for 15-30 seconds. Mention what you ordered and how it was.
            </p>
            <PrimaryButton onClick={startRecording} className="max-w-[280px]">Start Recording</PrimaryButton>
            <button className="mt-4 text-body-sm text-ink-tertiary cursor-pointer" onClick={() => go('entry')}>
              Use tap interface instead
            </button>
          </motion.div>
        )}

        {state === 'recording' && (
          <motion.div key="recording" className="flex flex-col items-center w-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="relative w-20 h-20 mb-6">
              <motion.div
                className="absolute inset-0 rounded-full bg-error/20"
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              />
              <div className="absolute inset-0 rounded-full bg-error flex items-center justify-center">
                <div className="w-6 h-6 rounded-sm bg-white" />
              </div>
            </div>
            <h2 className="text-display text-ink mb-2">Listening...</h2>
            <p className="text-body-sm text-ink-secondary mb-6">Speak naturally about your experience</p>
            {liveTranscript && (
              <div className="w-full max-w-[360px] bg-surface rounded-card p-5 mb-6 max-h-[200px] overflow-y-auto shadow-card border border-ink-ghost/20">
                <p className="text-body-sm text-ink leading-relaxed text-left">{liveTranscript}</p>
              </div>
            )}
            <PrimaryButton onClick={stopRecording} className="max-w-[280px]">Done Recording</PrimaryButton>
          </motion.div>
        )}

        {state === 'error' && (
          <motion.div key="error" className="flex flex-col items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="w-20 h-20 rounded-full bg-error/10 flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-display text-ink mb-2">Something went wrong</h2>
            <p className="text-body-sm text-ink-secondary mb-8 max-w-[300px]">{error}</p>
            <PrimaryButton onClick={reset} className="max-w-[280px]">Try Again</PrimaryButton>
            <button className="mt-4 text-body-sm text-ink-tertiary cursor-pointer" onClick={() => go('entry')}>
              Use tap interface instead
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </ScreenShell>
  );
}
