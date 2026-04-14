import { motion, AnimatePresence, useMotionValue, useTransform, MotionValue } from 'framer-motion';
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

export default function VoiceExpansion({ onTranscript, onComplete, onStateChange }: Props) {
  const [state, setState] = useState<VoiceState>('idle');
  const [error, setError] = useState('');
  const audioLevel = useMotionValue(0);

  const streamRef        = useRef<MediaStream | null>(null);
  const recorderRef      = useRef<MediaRecorder | null>(null);
  const audioCtxRef      = useRef<AudioContext | null>(null);
  const analyserRef      = useRef<AnalyserNode | null>(null);
  const animFrameRef     = useRef<number>(0);
  const chunksRef        = useRef<Blob[]>([]);
  const isCompletedRef   = useRef(false);

  useEffect(() => { onStateChange?.(state); }, [state, onStateChange]);

  // ── Waveform ─────────────────────────────────────────────────────
  // AnalyserNode reads frequency data via requestAnimationFrame —
  // no ScriptProcessor overhead, no destination connection needed.
  function startWaveform(stream: MediaStream) {
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);
    function tick() {
      animFrameRef.current = requestAnimationFrame(tick);
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      audioLevel.set(Math.min(1, (sum / data.length) / 80));
    }
    tick();
  }

  function stopWaveform() {
    cancelAnimationFrame(animFrameRef.current);
    audioLevel.set(0);
    try { audioCtxRef.current?.close(); } catch { /* ignore */ }
    audioCtxRef.current = null;
    analyserRef.current = null;
  }

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
    startWaveform(stream);

    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      stopWaveform();
      stream.getTracks().forEach(t => t.stop());
      streamRef.current = null;

      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      sendForTranscription(blob);
    };

    recorder.start(500); // chunk every 500ms — keeps final blob assembly fast
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
      stopWaveform();
      streamRef.current?.getTracks().forEach(t => t.stop());
      try {
        if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      } catch { /* ignore */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Render ───────────────────────────────────────────────────────
  if (state === 'idle') {
    return (
      <motion.button
        className="w-full max-w-[320px] rounded-button bg-surface border border-ink-ghost text-ink px-6 py-3.5 text-button cursor-pointer shadow-card"
        whileTap={{ scale: 0.97 }}
        onClick={startRecording}
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
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      <AnimatePresence mode="wait">
        {state === 'recording' && (
          <motion.div key="recording" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }} className="text-center">
            <Waveform audioLevel={audioLevel} />
            <p className="text-body-sm font-semibold text-ink mb-1 mt-4">Listening…</p>
            <p className="text-micro text-ink-tertiary mb-4">Speak naturally about your experience</p>
            <button onClick={finishRecording} className="text-micro text-primary font-medium">
              Tap to finish
            </button>
          </motion.div>
        )}

        {state === 'processing' && (
          <motion.div key="processing" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }} className="text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <motion.div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full"
                animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
            </div>
            <p className="text-body-sm font-semibold text-ink mb-1">Transcribing…</p>
            <p className="text-micro text-ink-tertiary">Usually takes a few seconds</p>
          </motion.div>
        )}

        {state === 'done' && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }} className="text-center">
            <motion.div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3"
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
              <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>
            <p className="text-body-sm font-semibold text-ink">Got it.</p>
          </motion.div>
        )}

        {state === 'error' && (
          <motion.div key="error" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }} className="text-center">
            <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-body-sm font-semibold text-ink mb-2">Something went wrong</p>
            <p className="text-micro text-ink-tertiary mb-4">{error}</p>
            <button onClick={retry} className="text-micro text-primary font-medium">Try again</button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Waveform({ audioLevel }: { audioLevel: MotionValue<number> }) {
  return (
    <div className="flex items-center justify-center gap-[3px] h-16 overflow-hidden">
      {Array.from({ length: 32 }).map((_, i) => (
        <WaveformBar key={i} audioLevel={audioLevel} index={i} total={32} />
      ))}
    </div>
  );
}

function WaveformBar({ audioLevel, index, total }: { audioLevel: MotionValue<number>; index: number; total: number }) {
  const centerDistance = Math.abs(index - total / 2) / (total / 2);
  const baseHeight = 1 - centerDistance * 0.7;
  const scaleY = useTransform(audioLevel, [0, 1], [1, 1 + baseHeight * 0.75]);
  return (
    <motion.div
      className="w-[2px] bg-primary rounded-full"
      style={{ height: `${baseHeight * 100}%`, scaleY }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    />
  );
}
