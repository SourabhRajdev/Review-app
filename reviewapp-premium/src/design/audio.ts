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
  /** Soft mechanical slider tick — like a notch snapping into place. */
  sliderTick() {
    try {
      const c = ensureCtx();
      if (!c) return;

      // Layer 1: Sharp transient click
      const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.015), c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        // Sharp attack, very fast exponential decay
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.12));
      }
      const src = c.createBufferSource();
      src.buffer = buf;
      const filter = c.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1800;
      filter.Q.value = 2.0;
      const gain = c.createGain();
      gain.gain.setValueAtTime(0.35, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.015);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(c.destination);
      src.start();

      // Layer 2: Tiny low body thud underneath
      const osc = c.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(280, c.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, c.currentTime + 0.02);
      const g2 = c.createGain();
      g2.gain.setValueAtTime(0.2, c.currentTime);
      g2.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.02);
      osc.connect(g2);
      g2.connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + 0.02);
    } catch {}
  },
  /** A primary tap — slightly weightier than tick. */
  tap() {
    tone('triangle', 540, 0.09, 0.18);
    noiseBurst(0.04, 0.04, 4000);
  },
  /** Rubber/elastic stretch sound using filtered noise. */
  draw(progress: number) {
    try {
      const c = ensureCtx();
      if (!c) return;

      // Layer 1 — Filtered noise (the "creaky" rubber texture)
      const bufferSize = Math.floor(c.sampleRate * 0.08);
      const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);

      const src = c.createBufferSource();
      src.buffer = buffer;

      // Bandpass filter — center frequency rises with pull progress
      const filter = c.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 200 + (progress * 600);
      filter.Q.value = 3.5;

      // Gain envelope — quiet at low pull, louder under tension
      // INCREASED BY 300% (4x original)
      const gainNode = c.createGain();
      const baseGain = (0.04 + (progress * 0.12)) * 4;
      gainNode.gain.setValueAtTime(baseGain, c.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.08);

      src.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(c.destination);
      src.start();

      // Layer 2 — Very subtle low creak underneath (adds body)
      // INCREASED BY 300% (4x original)
      if (progress > 0.4) {
        const src2 = c.createBufferSource();
        const buf2 = c.createBuffer(1, Math.floor(c.sampleRate * 0.06), c.sampleRate);
        const d2 = buf2.getChannelData(0);
        for (let i = 0; i < d2.length; i++) d2[i] = (Math.random() * 2 - 1);
        src2.buffer = buf2;
        const f2 = c.createBiquadFilter();
        f2.type = 'lowpass';
        f2.frequency.value = 120 + (progress * 80);
        const g2 = c.createGain();
        g2.gain.setValueAtTime((0.06 * progress) * 4, c.currentTime);
        g2.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.06);
        src2.connect(f2);
        f2.connect(g2);
        g2.connect(c.destination);
        src2.start();
      }
    } catch { /* fail silently */ }
  },
  /** Bow-string release thwack — rubber snapping forward. */
  release() {
    try {
      const c = ensureCtx();
      if (!c) return;

      // Sharp low thwack — rubber snapping
      const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.05), c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (buf.length * 0.15));
      }
      const src = c.createBufferSource();
      src.buffer = buf;
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800;
      const gain = c.createGain();
      gain.gain.setValueAtTime(0.9, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.05);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(c.destination);
      src.start();

      // High snap overtone
      setTimeout(() => {
        try {
          const buf2 = c.createBuffer(1, Math.floor(c.sampleRate * 0.03), c.sampleRate);
          const d2 = buf2.getChannelData(0);
          for (let i = 0; i < d2.length; i++) {
            d2[i] = (Math.random() * 2 - 1) * Math.exp(-i / (buf2.length * 0.1));
          }
          const s2 = c.createBufferSource();
          s2.buffer = buf2;
          const f2 = c.createBiquadFilter();
          f2.type = 'bandpass';
          f2.frequency.value = 2400;
          f2.Q.value = 1.2;
          const g2 = c.createGain();
          g2.gain.setValueAtTime(0.4, c.currentTime);
          g2.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.03);
          s2.connect(f2);
          f2.connect(g2);
          g2.connect(c.destination);
          s2.start();
        } catch {}
      }, 8);
    } catch { /* fail silently */ }
  },
  /** Arrow impact thunk on the target. */
  impact() {
    tone('sine', 130, 0.12, 0.32);
    noiseBurst(0.09, 0.16, 900);
  },
  /** Dramatic glass explosion — bomb-like impact + realistic glass shatter. */
  jarShatter() {
    try {
      const c = ensureCtx();
      if (!c) return;

      // === BOMB-LIKE IMPACT BOOM (0ms) — Deep explosive thud ===
      const boomOsc = c.createOscillator();
      boomOsc.type = 'sine';
      boomOsc.frequency.setValueAtTime(80, c.currentTime);
      boomOsc.frequency.exponentialRampToValueAtTime(30, c.currentTime + 0.25);
      const boomGain = c.createGain();
      boomGain.gain.setValueAtTime(1.5, c.currentTime);
      boomGain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.25);
      boomOsc.connect(boomGain);
      boomGain.connect(c.destination);
      boomOsc.start();
      boomOsc.stop(c.currentTime + 0.26);

      // === INITIAL CRACK TRANSIENT (0ms) — Sharp high-frequency snap ===
      const crackBuf = c.createBuffer(1, Math.floor(c.sampleRate * 0.015), c.sampleRate);
      const crackData = crackBuf.getChannelData(0);
      for (let i = 0; i < crackData.length; i++) crackData[i] = (Math.random() * 2 - 1);
      const crackSrc = c.createBufferSource();
      crackSrc.buffer = crackBuf;
      const crackFilter = c.createBiquadFilter();
      crackFilter.type = 'highpass';
      crackFilter.frequency.value = 5000;
      const crackGain = c.createGain();
      crackGain.gain.setValueAtTime(1.8, c.currentTime);
      crackGain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.015);
      crackSrc.connect(crackFilter);
      crackFilter.connect(crackGain);
      crackGain.connect(c.destination);
      crackSrc.start();

      // === GLASS SHATTER CASCADE (15ms) — Multiple glass pieces breaking ===
      setTimeout(() => {
        try {
          // High-frequency glass tinkle
          const shatterBuf = c.createBuffer(1, Math.floor(c.sampleRate * 0.35), c.sampleRate);
          const shatterData = shatterBuf.getChannelData(0);
          for (let i = 0; i < shatterData.length; i++) {
            shatterData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (shatterData.length * 0.3));
          }
          const shatterSrc = c.createBufferSource();
          shatterSrc.buffer = shatterBuf;
          const shatterFilter = c.createBiquadFilter();
          shatterFilter.type = 'bandpass';
          shatterFilter.frequency.value = 3500;
          shatterFilter.Q.value = 1.5;
          const shatterGain = c.createGain();
          shatterGain.gain.setValueAtTime(1.2, c.currentTime);
          shatterGain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.35);
          shatterSrc.connect(shatterFilter);
          shatterFilter.connect(shatterGain);
          shatterGain.connect(c.destination);
          shatterSrc.start();
        } catch {}
      }, 15);

      // === GLASS SCATTER LAYER 2 (30ms) — Mid-range glass debris ===
      setTimeout(() => {
        try {
          const scatterBuf = c.createBuffer(1, Math.floor(c.sampleRate * 0.28), c.sampleRate);
          const scatterData = scatterBuf.getChannelData(0);
          for (let i = 0; i < scatterData.length; i++) {
            scatterData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (scatterData.length * 0.25));
          }
          const scatterSrc = c.createBufferSource();
          scatterSrc.buffer = scatterBuf;
          const scatterFilter = c.createBiquadFilter();
          scatterFilter.type = 'bandpass';
          scatterFilter.frequency.value = 2000;
          scatterFilter.Q.value = 0.8;
          const scatterGain = c.createGain();
          scatterGain.gain.setValueAtTime(0.9, c.currentTime);
          scatterGain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.28);
          scatterSrc.connect(scatterFilter);
          scatterFilter.connect(scatterGain);
          scatterGain.connect(c.destination);
          scatterSrc.start();
        } catch {}
      }, 30);

      // === EXPLOSIVE AIR BURST (50ms) — Whoosh of displaced air ===
      setTimeout(() => {
        try {
          const airBuf = c.createBuffer(1, Math.floor(c.sampleRate * 0.22), c.sampleRate);
          const airData = airBuf.getChannelData(0);
          for (let i = 0; i < airData.length; i++) {
            airData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (airData.length * 0.4));
          }
          const airSrc = c.createBufferSource();
          airSrc.buffer = airBuf;
          const airFilter = c.createBiquadFilter();
          airFilter.type = 'lowpass';
          airFilter.frequency.value = 800;
          const airGain = c.createGain();
          airGain.gain.setValueAtTime(0.7, c.currentTime);
          airGain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.22);
          airSrc.connect(airFilter);
          airFilter.connect(airGain);
          airGain.connect(c.destination);
          airSrc.start();
        } catch {}
      }, 50);

      // === GLASS TINKLE TAIL (120ms) — Small pieces settling ===
      setTimeout(() => {
        try {
          const tinkleBuf = c.createBuffer(1, Math.floor(c.sampleRate * 0.4), c.sampleRate);
          const tinkleData = tinkleBuf.getChannelData(0);
          for (let i = 0; i < tinkleData.length; i++) {
            // Sparse random hits for individual glass pieces
            tinkleData[i] = Math.random() > 0.7 ? (Math.random() * 2 - 1) : 0;
          }
          const tinkleSrc = c.createBufferSource();
          tinkleSrc.buffer = tinkleBuf;
          const tinkleFilter = c.createBiquadFilter();
          tinkleFilter.type = 'highpass';
          tinkleFilter.frequency.value = 4000;
          const tinkleGain = c.createGain();
          tinkleGain.gain.setValueAtTime(0.4, c.currentTime);
          tinkleGain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4);
          tinkleSrc.connect(tinkleFilter);
          tinkleFilter.connect(tinkleGain);
          tinkleGain.connect(c.destination);
          tinkleSrc.start();
        } catch {}
      }, 120);

      // === RESONANT RING (180ms) — Metallic/ceramic resonance ===
      setTimeout(() => {
        try {
          const ringOsc = c.createOscillator();
          ringOsc.type = 'sine';
          ringOsc.frequency.value = 1800;
          const ringGain = c.createGain();
          ringGain.gain.setValueAtTime(0.3, c.currentTime);
          ringGain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.35);
          ringOsc.connect(ringGain);
          ringGain.connect(c.destination);
          ringOsc.start();
          ringOsc.stop(c.currentTime + 0.36);
        } catch {}
      }, 180);
    } catch { /* fail silently */ }
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
