import { motion, AnimatePresence, useMotionValue, useTransform, MotionValue } from 'framer-motion';
import { useState, useEffect, useRef, useCallback } from 'react';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';

type VoiceState = 'idle' | 'expanding' | 'listening' | 'processing' | 'done' | 'error';

interface Props {
  onTranscript: (text: string) => void;
  onComplete: () => void;
  onStateChange?: (state: VoiceState) => void;
}

// AssemblyAI Streaming v3 — verified protocol (tested 2026-04-14):
//   model:   u3-rt-pro
//   auth:    ?token=<key> query param
//   audio:   raw binary WebSocket frames (Int16 LE PCM at 16 kHz) — NOT base64 JSON
//   begin:   { type: "Begin", id, expires_at }
//   turns:   { type: "Turn", transcript, turn_is_formatted, ... }
//   end:     { type: "Terminate" } → server replies { type: "Termination" } → close 1000
const ASSEMBLYAI_WS_BASE = 'wss://streaming.assemblyai.com/v3/ws';
const VOICE_TOKEN_URL = '/api/voice-token';

export default function VoiceExpansion({ onTranscript, onComplete, onStateChange }: Props) {
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const audioLevel = useMotionValue(0);

  const wsRef             = useRef<WebSocket | null>(null);
  const audioContextRef   = useRef<AudioContext | null>(null);
  const streamRef         = useRef<MediaStream | null>(null);
  const sourceNodeRef     = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorNodeRef  = useRef<ScriptProcessorNode | null>(null);
  const sessionReadyRef   = useRef(false);   // true after "Begin" received
  const finalTranscriptRef = useRef('');
  const partialTextRef    = useRef('');
  const isManualStopRef   = useRef(false);
  const isCompletedRef    = useRef(false);
  const completionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { onStateChange?.(state); }, [state, onStateChange]);

  // ── Completion ──────────────────────────────────────────────────
  const completeWithTranscript = useCallback((text: string) => {
    if (isCompletedRef.current) return;
    isCompletedRef.current = true;

    if (completionTimeoutRef.current) {
      clearTimeout(completionTimeoutRef.current);
      completionTimeoutRef.current = null;
    }

    const clean = text.trim();
    if (!clean) {
      setError('No speech detected. Please try again.');
      setState('error');
      return;
    }

    setState('processing');
    haptics.bump();
    onTranscript(clean);

    setTimeout(() => {
      setState('done');
      audio.perfect();
      haptics.impact();
      setTimeout(() => onComplete(), 200);
    }, 500);
  }, [onTranscript, onComplete]);

  // ── Entry point ─────────────────────────────────────────────────
  async function startListening() {
    audio.warmup();
    audio.tap();
    haptics.press();

    setState('expanding');
    setError('');
    setTranscript('');
    finalTranscriptRef.current  = '';
    partialTextRef.current      = '';
    isManualStopRef.current     = false;
    isCompletedRef.current      = false;
    sessionReadyRef.current     = false;

    // 1. Mic first — eliminates permission-dialog delay after WS opens.
    //    Server closes with 1011 if audio doesn't arrive within ~1s.
    try {
      await setupAudioPipeline();
    } catch {
      return; // error already set inside setupAudioPipeline
    }

    // 2. Token from backend (keeps raw key off the browser bundle)
    let token: string;
    try {
      const res = await fetch(VOICE_TOKEN_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      ({ token } = await res.json());
    } catch (err) {
      console.error('[AssemblyAI] Token fetch failed:', err);
      setError('Could not connect to voice service. Is the server running?');
      setState('error');
      cleanup();
      return;
    }

    // 3. Open WebSocket — audio pipeline already running, sends on first Begin
    setState('listening');
    openWebSocket(token);
  }

  // ── Audio pipeline ───────────────────────────────────────────────
  // Mic → AudioContext @ 16 kHz → ScriptProcessor → raw Int16 PCM binary frames
  async function setupAudioPipeline() {
    try {
      console.log('[AssemblyAI] Requesting microphone...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      const ctx = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      sourceNodeRef.current = source;

      // 4096 samples @ 16 kHz ≈ 256 ms per chunk — low latency, stays under WS frame limits
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorNodeRef.current = processor;

      processor.onaudioprocess = (e) => {
        // Hold until AssemblyAI sends "Begin" — avoids 1011 from premature audio
        if (!sessionReadyRef.current || wsRef.current?.readyState !== WebSocket.OPEN) return;

        const f32 = e.inputBuffer.getChannelData(0);

        // Float32 → Int16 PCM (little-endian, what AssemblyAI v3 expects as binary frames)
        const pcm16 = new Int16Array(f32.length);
        for (let i = 0; i < f32.length; i++) {
          const s = Math.max(-1, Math.min(1, f32[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Send raw binary ArrayBuffer (NOT JSON/base64 — v3 protocol requirement)
        wsRef.current.send(pcm16.buffer);

        // Drive waveform from real RMS level
        let sumSq = 0;
        for (let i = 0; i < f32.length; i++) sumSq += f32[i] * f32[i];
        audioLevel.set(Math.min(1, Math.sqrt(sumSq / f32.length) * 10));
      };

      source.connect(processor);
      processor.connect(ctx.destination); // must connect to destination or onaudioprocess won't fire
      console.log('[AssemblyAI] Audio pipeline ready');
    } catch (err) {
      console.error('[AssemblyAI] Mic setup failed:', err);
      setError('Microphone access denied. Please allow mic and try again.');
      setState('error');
      cleanup();
      throw err;
    }
  }

  // ── WebSocket ────────────────────────────────────────────────────
  function openWebSocket(token: string) {
    const url = `${ASSEMBLYAI_WS_BASE}?sample_rate=16000&speech_model=u3-rt-pro&token=${token}`;
    console.log('[AssemblyAI] Connecting...');
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[AssemblyAI] WebSocket open — waiting for Begin');
    };

    ws.onmessage = (event) => {
      let msg: Record<string, unknown>;
      try { msg = JSON.parse(event.data as string); } catch { return; }

      const type = msg.type as string;
      console.log('[AssemblyAI] msg:', type, msg);

      if (type === 'Begin') {
        // Session confirmed — audio will now flow
        sessionReadyRef.current = true;
        console.log('[AssemblyAI] Session started, id:', msg.id);

      } else if (type === 'Turn') {
        // v3 uses Turns instead of Partial/FinalTranscript
        // turn_is_formatted=false → interim (partial)
        // turn_is_formatted=true  → finalized with punctuation
        const text = (msg.transcript as string) || '';
        const isFinal = Boolean(msg.turn_is_formatted);

        if (isFinal && text.trim()) {
          finalTranscriptRef.current += (finalTranscriptRef.current ? ' ' : '') + text;
          partialTextRef.current = '';
          setTranscript(finalTranscriptRef.current);
          console.log('[AssemblyAI] Final turn:', text);
        } else if (!isFinal) {
          partialTextRef.current = text;
          setTranscript((finalTranscriptRef.current + (text ? ' ' + text : '')).trim());
        }

        // If user already tapped finish and a final turn just arrived, complete
        if (isManualStopRef.current && isFinal) {
          const full = finalTranscriptRef.current.trim();
          if (full) {
            cleanup();
            completeWithTranscript(full);
          }
        }

      } else if (type === 'Termination') {
        console.log('[AssemblyAI] Session terminated:', msg);

      } else if (msg.error) {
        console.error('[AssemblyAI] Server error:', msg.error);
        setError(String(msg.error));
        setState('error');
        cleanup();
      }
    };

    ws.onerror = () => {
      console.error('[AssemblyAI] WebSocket error');
      setError('Connection error. Please try again.');
      setState('error');
      cleanup();
    };

    ws.onclose = (event) => {
      console.log('[AssemblyAI] WebSocket closed — code:', event.code, 'reason:', event.reason);
      if (isManualStopRef.current && !isCompletedRef.current) {
        const finalText = finalTranscriptRef.current.trim();
        if (finalText) {
          completeWithTranscript(finalText);
        } else {
          setError('No speech detected. Please try again.');
          setState('error');
        }
      } else if (!isManualStopRef.current && event.code !== 1000 && !isCompletedRef.current) {
        setError(`Connection lost (code ${event.code}). Please try again.`);
        setState('error');
      }
    };
  }

  // ── User taps "Tap to finish" ────────────────────────────────────
  function finishListening() {
    console.log('[AssemblyAI] User finished. transcript so far:', finalTranscriptRef.current);
    isManualStopRef.current = true;
    haptics.press();

    const current = finalTranscriptRef.current.trim();
    if (current) {
      // Have finalized text already — complete immediately
      cleanup();
      completeWithTranscript(current);
    } else {
      // Wait up to 2s for any in-flight final turn before giving up
      cleanup();
      completionTimeoutRef.current = setTimeout(() => {
        if (!isCompletedRef.current) {
          setError('No speech detected. Please try again.');
          setState('error');
        }
      }, 2000);
    }
  }

  // ── Cleanup ──────────────────────────────────────────────────────
  function cleanup() {
    try { processorNodeRef.current?.disconnect(); sourceNodeRef.current?.disconnect(); } catch { /* ignore */ }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close().catch(() => { /* ignore */ });
    }
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ type: 'Terminate' }));
        setTimeout(() => { wsRef.current?.close(); }, 300);
      } catch { /* ignore */ }
    }
  }

  function retry() {
    setState('idle');
    setError('');
    setTranscript('');
    finalTranscriptRef.current  = '';
    partialTextRef.current      = '';
    isCompletedRef.current      = false;
    isManualStopRef.current     = false;
    sessionReadyRef.current     = false;
  }

  useEffect(() => {
    return () => {
      if (completionTimeoutRef.current) clearTimeout(completionTimeoutRef.current);
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Render ───────────────────────────────────────────────────────
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
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      <AnimatePresence mode="wait">
        {state === 'expanding' && (
          <motion.div key="expanding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <motion.svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 0.6, repeat: Infinity }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </motion.svg>
            </div>
            <p className="text-body-sm text-ink-secondary">Connecting…</p>
          </motion.div>
        )}

        {state === 'listening' && (
          <motion.div key="listening" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }} className="text-center">
            <Waveform audioLevel={audioLevel} />
            <p className="text-body-sm font-semibold text-ink mb-1 mt-4">Listening…</p>
            <p className="text-micro text-ink-tertiary mb-4 max-h-20 overflow-y-auto leading-relaxed">
              {transcript || 'Start speaking'}
            </p>
            <button onClick={finishListening} className="text-micro text-primary font-medium">
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
            <p className="text-body-sm text-ink-secondary">Processing…</p>
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
            <p className="text-body-sm font-semibold text-ink">Got it!</p>
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
