// Tiny Web Audio synth. Generates all sound effects at runtime so we
// don't ship any audio assets. Each sound is a short oscillator + envelope
// + optional filtered noise burst. Tuned to feel tactile, not retro.
//
// IMPORTANT: AudioContext must be created/resumed inside a user gesture,
// so audio.warmup() should be called from the first tap (Entry screen's
// "Start" button). Until then audio.* calls are silent no-ops.

let ctx: AudioContext | null = null;

function ensureCtx() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }
  return ctx;
}

function envelope(
  param: AudioParam,
  start: number,
  peak: number,
  attack: number,
  release: number,
  c: AudioContext
) {
  const t = c.currentTime;
  param.cancelScheduledValues(t);
  param.setValueAtTime(start, t);
  param.linearRampToValueAtTime(peak, t + attack);
  param.exponentialRampToValueAtTime(0.0001, t + attack + release);
}

function tone(
  type: OscillatorType,
  freq: number,
  duration: number,
  peakGain = 0.18
) {
  const c = ensureCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(c.destination);
  envelope(gain.gain, 0, peakGain, 0.005, duration, c);
  osc.start();
  osc.stop(c.currentTime + duration + 0.05);
}

function sweep(
  startFreq: number,
  endFreq: number,
  duration: number,
  peakGain = 0.14
) {
  const c = ensureCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(startFreq, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(endFreq, c.currentTime + duration);
  osc.connect(gain);
  gain.connect(c.destination);
  envelope(gain.gain, 0, peakGain, 0.01, duration, c);
  osc.start();
  osc.stop(c.currentTime + duration + 0.05);
}

export const audio = {
  /** Call once on first user gesture to unlock the AudioContext. */
  warmup() {
    ensureCtx();
  },
  /** Resume audio context on user gesture. */
  resume() {
    try {
      const c = ensureCtx();
      if (c?.state === 'suspended') c.resume();
    } catch {}
  },
  /** A small UI confirmation tick. */
  tick() {
    tone('triangle', 880, 0.06, 0.12);
  },
  /** A primary tap — slightly weightier than tick. */
  tap() {
    tone('triangle', 540, 0.09, 0.18);
    noiseBurst(0.04, 0.04, 4000);
  },
  /** Bow-string tension rising. Pass progress 0..1 to vary pitch. */
  draw(progress: number) {
    const c = ensureCtx();
    if (!c) return;
    tone('sine', 200 + progress * 320, 0.08, 0.06 + progress * 0.06);
  },
  /** Bow-string release thwack. */
  release() {
    sweep(420, 90, 0.18, 0.22);
    noiseBurst(0.06, 0.18, 1600);
  },
  /** Arrow impact thunk on the target. */
  impact() {
    tone('sine', 130, 0.12, 0.32);
    noiseBurst(0.09, 0.16, 900);
  },
  /** Bullseye bell — bright, short, satisfying. */
  bullseye() {
    tone('triangle', 1320, 0.4, 0.2);
    tone('triangle', 1980, 0.3, 0.1);
  },
  /** Crispy slice — high filtered noise burst, short. */
  slice() {
    noiseBurst(0.05, 0.18, 6000);
    sweep(2200, 600, 0.07, 0.1);
  },
  /** Solid thud — low sine + dampened noise. Use on landings. */
  thud() {
    tone('sine', 110, 0.14, 0.32);
    noiseBurst(0.06, 0.1, 600);
  },
  /** Bright two-tone chime — perfect / clean hit. */
  perfect() {
    tone('triangle', 1568, 0.18, 0.18); // G6
    tone('triangle', 2349, 0.22, 0.12); // D7
  },
  /** Dull penalty thud. Use on misses / wrong slices. */
  miss() {
    tone('sine', 70, 0.18, 0.22);
    noiseBurst(0.08, 0.06, 400);
  },
  /** Combo confirmation — short rising blip. */
  combo() {
    sweep(620, 1240, 0.1, 0.12);
  },
  /** Synthesized crowd cheer (Woah!) — rising pitch + noise burst. */
  cheer() {
    try {
      // Rising pitch burst
      sweep(400, 900, 0.85, 0.18);
      // Clapping-like noise envelope
      setTimeout(() => noiseBurst(0.12, 0.7, 1500), 100);
      setTimeout(() => noiseBurst(0.10, 0.4, 1200), 300);
    } catch { /* fail silently */ }
  },
  /** Synthesized crowd boo — low descending groan. */
  boo() {
    try {
      sweep(200, 100, 0.9, 0.25);
      noiseBurst(0.08, 0.5, 500);
    } catch { /* fail silently */ }
  }
};

function noiseBurst(gain: number, duration: number, freq: number) {
  try {
    const c = ensureCtx();
    if (!c) return;
    const bufferSize = c.sampleRate * duration;
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
    const source = c.createBufferSource();
    source.buffer = buffer;
    const gainNode = c.createGain();
    gainNode.gain.setValueAtTime(gain, c.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = 0.8;
    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(c.destination);
    source.start();
  } catch { /* fail silently */ }
}
