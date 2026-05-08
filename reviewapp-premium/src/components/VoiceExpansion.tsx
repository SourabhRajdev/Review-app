import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';

// AssemblyAI Pre-recorded STT — backend endpoint
// Flow: MediaRecorder → Blob → POST /api/voice-transcribe →
//       backend uploads to AssemblyAI → polls until complete → returns { transcript }
// No streaming, no WebSocket, no duplicate words.
const TRANSCRIBE_URL = '/api/voice-transcribe';

type VoiceState = 'idle' | 'recording' | 'processing' | 'done' | 'error';

interface Props {
  onTranscript: (text: string) => void;
  onComplete: () => void;
  onStateChange?: (state: VoiceState) => void;
}

// ── SVG arc spinner — light theme version ──
function ArcSpinner() {
  return (
    <motion.svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      animate={{ rotate: 360 }}
      transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
      className="mx-auto"
    >
      {/* Background ring */}
      <circle cx="24" cy="24" r="18" stroke="rgba(200,170,140,0.25)" strokeWidth="3" />
      {/* Spinning arc — coffee color */}
      <path
        d="M24 6 a18 18 0 0 1 18 18"
        stroke="#C67C4E"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </motion.svg>
  );
}

export default function VoiceExpansion({ onTranscript, onComplete, onStateChange }: Props) {
  const [state, setState] = useState<VoiceState>('idle');
  const [error, setError] = useState('');

  const streamRef        = useRef<MediaStream | null>(null);
  const recorderRef      = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const isCompletedRef   = useRef(false);

  useEffect(() => { onStateChange?.(state); }, [state, onStateChange]);

  // ── Start recording ──────────────────────────────────────────────
  async function startRecording() {
    audio.warmup();
    audio.tap();
    haptics.press();
    setError('');
    isCompletedRef.current = false;
    chunksRef.current = [];

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch {
      setError('Microphone access denied. Please allow mic and try again.');
      setState('error');
      return;
    }

    streamRef.current = stream;

    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      streamRef.current = null;

      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      sendForTranscription(blob);
    };

    recorder.start(500);
    setState('recording');
  }

  // ── User taps "Tap to finish" ────────────────────────────────────
  function finishRecording() {
    haptics.press();
    if (recorderRef.current?.state === 'recording') {
      setState('processing');
      recorderRef.current.stop();
    }
  }

  // ── Upload blob → backend → AssemblyAI pre-recorded STT ─────────
  async function sendForTranscription(blob: Blob) {
    try {
      console.log('[Voice] Uploading audio blob, size:', blob.size, 'type:', blob.type);

      const res = await fetch(TRANSCRIBE_URL, {
        method: 'POST',
        headers: { 'Content-Type': blob.type || 'audio/webm' },
        body: blob,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      console.log('[Voice] Transcription result:', data);

      const text = (data.transcript || '').trim();
      if (!text) {
        setError('No speech detected. Please speak clearly and try again.');
        setState('error');
        return;
      }

      if (isCompletedRef.current) return;
      isCompletedRef.current = true;

      setState('done');
      audio.perfect();
      haptics.impact();
      onTranscript(text);
      setTimeout(() => onComplete(), 300);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Voice] Transcription failed:', msg);
      setError('Transcription failed. Please try again.');
      setState('error');
    }
  }

  // ── Retry ────────────────────────────────────────────────────────
  function retry() {
    setState('idle');
    setError('');
    isCompletedRef.current = false;
    chunksRef.current = [];
  }

  // ── Cleanup on unmount ───────────────────────────────────────────
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      try {
        if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      } catch { /* ignore */ }
    };
  }, []);

  // ── Idle state — white card with coffee border ───────────────────
  if (state === 'idle') {
    return (
      <motion.button
        className="w-full max-w-[320px] rounded-button px-6 py-3.5 text-button cursor-pointer focus-visible:outline-none"
        style={{
          background: '#FFFFFF',
          border: '1.5px solid rgba(198,124,78,0.35)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(198,124,78,0.08)',
          color: '#1A0E08',
        }}
        whileTap={{ scale: 0.97 }}
        whileHover={{ y: -1, boxShadow: '0 4px 20px rgba(198,124,78,0.15), 0 1px 4px rgba(0,0,0,0.06)' }}
        onClick={startRecording}
      >
        <span className="flex flex-col items-center justify-center gap-0.5">
          <span className="flex items-center gap-2">
            {/* Microphone icon — pulses subtly at idle */}
            <motion.svg
              className="w-4 h-4"
              style={{ color: '#C67C4E' }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </motion.svg>
            <span className="font-bold text-ink">Speak your review</span>
          </span>
          <span className="text-micro text-ink-tertiary">or play games below</span>
        </span>
      </motion.button>
    );
  }

  return (
    <motion.div
      className="w-full max-w-[320px] rounded-card p-6"
      style={{
        background: '#FFFFFF',
        border: '1px solid rgba(200,170,140,0.25)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
      }}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      <AnimatePresence mode="wait">
        {state === 'recording' && (
          <motion.div
            key="recording"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-center"
          >
            <Waveform />
            <p className="text-body-sm font-semibold text-ink mb-1 mt-4">Listening…</p>
            <p className="text-micro text-ink-tertiary mb-4">Speak naturally about your experience</p>
            <button
              onClick={finishRecording}
              className="text-micro text-primary font-medium hover:text-primary-hover transition-colors cursor-pointer"
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
            <div className="mb-3">
              <ArcSpinner />
            </div>
            <p className="text-body-sm font-semibold text-ink mb-1">Transcribing…</p>
            <p className="text-micro text-ink-tertiary">Usually takes a few seconds</p>
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
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: 'rgba(13,158,111,0.1)', border: '1px solid rgba(13,158,111,0.2)' }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <svg className="w-6 h-6" style={{ color: '#0D9E6F' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>
            <p className="text-body-sm font-semibold text-ink">Got it.</p>
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
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: 'rgba(229,62,62,0.08)', border: '1px solid rgba(229,62,62,0.2)' }}
            >
              <svg className="w-6 h-6 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-body-sm font-semibold text-ink mb-2">Something went wrong</p>
            <p className="text-micro text-ink-tertiary mb-4">{error}</p>
            <button
              onClick={retry}
              className="text-micro text-primary font-medium hover:text-primary-hover transition-colors cursor-pointer"
            >
              Try again
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Constant looping waveform — always animated, coffee-tinted bars ──
function Waveform() {
  const BARS = 28;
  return (
    <div className="flex items-center justify-center gap-[3px] h-16 overflow-hidden">
      {Array.from({ length: BARS }).map((_, i) => {
        const centerDistance = Math.abs(i - BARS / 2) / (BARS / 2);
        const maxH = Math.round((1 - centerDistance * 0.65) * 100);
        const minH = Math.round(maxH * 0.25);
        const delay = (i / BARS) * -1.4;
        return (
          <motion.div
            key={i}
            className="w-[2px] rounded-full"
            style={{ background: '#C67C4E' }}
            animate={{ height: [`${minH}%`, `${maxH}%`, `${minH}%`] }}
            transition={{
              duration: 1.1 + (i % 5) * 0.08,
              repeat: Infinity,
              ease: 'easeInOut',
              delay,
            }}
          />
        );
      })}
    </div>
  );
}
