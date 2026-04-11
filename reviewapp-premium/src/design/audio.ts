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

function noiseBurst(duration: number, peakGain = 0.12, lowpass = 1200) {
  const c = ensureCtx();
  if (!c) return;
  const buffer = c.createBuffer(1, c.sampleRate * duration, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowpass;
  const gain = c.createGain();
  src.connect(filter);
  filter.connect(gain);
  gain.connect(c.destination);
  envelope(gain.gain, 0, peakGain, 0.005, duration, c);
  src.start();
  src.stop(c.currentTime + duration + 0.05);
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
  }
};
