import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { useState, useEffect, useRef, useCallback } from 'react';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';

type VoiceState = 'idle' | 'expanding' | 'listening' | 'processing' | 'done' | 'error';

interface Props {
  onTranscript: (text: string) => void;
  onComplete: () => void;
  onStateChange?: (state: VoiceState) => void;
}

export default function VoiceExpansion({ onTranscript, onComplete, onStateChange }: Props) {
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const audioLevel = useMotionValue(0);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef('');
  const isManualStopRef = useRef(false);

  // Notify parent of state changes
  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  // Complete the flow with transcript
  const completeWithTranscript = useCallback((text: string) => {
    console.log('🎯 [VoiceExpansion] completeWithTranscript called with:', text);
    
    if (!text || text.trim().length === 0) {
      console.error('❌ [VoiceExpansion] Empty transcript');
      setError('No speech detected. Please try again.');
      setState('error');
      return;
    }

    console.log('✅ [VoiceExpansion] Setting state to processing');
    setState('processing');
    haptics.bump();
    
    // CRITICAL: Call onTranscript IMMEDIATELY to store the text
    console.log('📤 [VoiceExpansion] Calling onTranscript IMMEDIATELY');
    onTranscript(text);
    
    // Show processing state briefly
    setTimeout(() => {
      console.log('✅ [VoiceExpansion] Setting state to done');
      setState('done');
      audio.perfect();
      haptics.impact();
      
      // Navigate after a delay to ensure state is saved
      setTimeout(() => {
        console.log('🚀 [VoiceExpansion] Calling onComplete (should navigate)');
        onComplete();
      }, 200);
    }, 600);
  }, [onTranscript, onComplete]);

  // Start voice recognition
  function startListening() {
    audio.warmup();
    audio.tap();
    haptics.press();
    
    setError('');
    setTranscript('');
    finalTranscriptRef.current = '';
    isManualStopRef.current = false;
    
    setState('expanding');
    
    // Transition to listening after expansion animation
    setTimeout(() => {
      setState('listening');
      initSpeechRecognition();
    }, 300);
  }

  function initSpeechRecognition() {
    if (typeof window === 'undefined') {
      setError('Speech recognition not available');
      setState('error');
      return;
    }
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('[VoiceExpansion] Speech recognition not supported');
      setError('Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.');
      setState('error');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      // Recognition started
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPart + ' ';
        } else {
          interimTranscript += transcriptPart;
        }
      }

      // Update final transcript ref
      if (finalTranscript) {
        finalTranscriptRef.current += finalTranscript;
      }

      const fullTranscript = (finalTranscriptRef.current + interimTranscript).trim();
      setTranscript(fullTranscript);
      
      // Simulate audio level based on speech
      if (fullTranscript) {
        audioLevel.set(0.3 + Math.random() * 0.7);
      }
    };

    recognition.onend = () => {
      // Only process if it was a manual stop
      if (isManualStopRef.current) {
        const finalText = finalTranscriptRef.current.trim();
        
        if (finalText) {
          completeWithTranscript(finalText);
        } else {
          setError('No speech detected. Please try again.');
          setState('error');
        }
      }
    };

    recognition.onerror = (event: any) => {
      // Ignore no-speech errors if we already have transcript
      if (event.error === 'no-speech' && finalTranscriptRef.current.trim()) {
        return;
      }
      
      setError(`Speech recognition error: ${event.error}. Please try again.`);
      setState('error');
    };

    recognitionRef.current = recognition;
    
    try {
      recognition.start();
    } catch (err) {
      setError('Failed to start recording. Please try again.');
      setState('error');
    }
  }

  function finishListening() {
    isManualStopRef.current = true;
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        // Still try to complete with what we have
        const finalText = finalTranscriptRef.current.trim();
        if (finalText) {
          completeWithTranscript(finalText);
        } else {
          setError('No speech detected. Please try again.');
          setState('error');
        }
      }
    }
  }

  function retry() {
    setState('idle');
    setError('');
    setTranscript('');
    finalTranscriptRef.current = '';
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {
          // Cleanup error
        }
      }
    };
  }, []);

  // Animate audio level back to 0 when not speaking
  useEffect(() => {
    if (state === 'listening') {
      const interval = setInterval(() => {
        audioLevel.set(audioLevel.get() * 0.85);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [state, audioLevel]);

  if (state === 'idle') {
    return (
      <motion.button
        className="w-full max-w-[320px] rounded-button bg-surface border border-ink-ghost text-ink px-6 py-3.5 text-button cursor-pointer shadow-card"
        whileTap={{ scale: 0.97 }}
        onClick={startListening}
      >
        <span className="flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          Use Voice
        </span>
      </motion.button>
    );
  }

  return (
    <motion.div
      className="w-full max-w-[320px] rounded-card bg-surface border border-ink-ghost shadow-elevated p-6"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <AnimatePresence mode="wait">
        {state === 'expanding' && (
          <motion.div
            key="expanding"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="text-center"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <motion.svg
                className="w-5 h-5 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.6, repeat: Infinity }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </motion.svg>
            </div>
            <p className="text-body-sm text-ink-secondary">Initializing...</p>
          </motion.div>
        )}

        {state === 'listening' && (
          <motion.div
            key="listening"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-center"
          >
            <Waveform audioLevel={audioLevel} />
            <p className="text-body-sm font-semibold text-ink mb-1 mt-4">Listening...</p>
            <p className="text-micro text-ink-tertiary mb-4">
              {transcript || 'Start speaking'}
            </p>
            <button
              onClick={finishListening}
              className="text-micro text-primary font-medium"
            >
              Tap to finish
            </button>
          </motion.div>
        )}

        {state === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-center"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <motion.div
                className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              />
            </div>
            <p className="text-body-sm text-ink-secondary">Processing...</p>
          </motion.div>
        )}

        {state === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-center"
          >
            <motion.div
              className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>
            <p className="text-body-sm font-semibold text-ink">Got it!</p>
          </motion.div>
        )}

        {state === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-center"
          >
            <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-body-sm font-semibold text-ink mb-2">Something went wrong</p>
            <p className="text-micro text-ink-tertiary mb-4">{error}</p>
            <button
              onClick={retry}
              className="text-micro text-primary font-medium"
            >
              Try again
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Waveform visualization component
function Waveform({ audioLevel }: { audioLevel: any }) {
  const bars = 32;
  
  return (
    <div className="flex items-center justify-center gap-[3px] h-16">
      {Array.from({ length: bars }).map((_, i) => {
        // Create wave pattern - center bars are taller
        const centerDistance = Math.abs(i - bars / 2) / (bars / 2);
        const baseHeight = 1 - centerDistance * 0.7;
        
        // Use audio level to modulate height
        const heightMultiplier = useTransform(
          audioLevel,
          [0, 1],
          [0.2, 1]
        );
        
        return (
          <motion.div
            key={i}
            className="w-[2px] bg-primary rounded-full"
            style={{
              height: useTransform(
                heightMultiplier,
                (v) => `${baseHeight * v * 100}%`
              ),
            }}
            animate={{
              scaleY: [1, 1.2, 0.8, 1.1, 1],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.02,
              ease: 'easeInOut',
            }}
          />
        );
      })}
    </div>
  );
}
