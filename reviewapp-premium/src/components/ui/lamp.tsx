import { motion } from 'framer-motion';

// Bracket bottom edge — light starts exactly here, not a pixel above.
const BRACKET_TOP    = 44;
const BRACKET_HEIGHT = 10;
const LIGHT_START    = BRACKET_TOP + BRACKET_HEIGHT;

export default function Lamp() {
  return (
    <div
      className="absolute top-0 left-0 right-0 z-0 pointer-events-none"
      style={{ height: '280px' }}
    >
      {/* ── 1. Bracket ───────────────────────────────────────────────
           Dark, flat, zero glow. Clearly readable against cream.      */}
      <motion.div
        initial={{ width: '40%', opacity: 0 }}
        animate={{ width: '70%', opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'absolute',
          top: BRACKET_TOP,
          left: '50%',
          transform: 'translateX(-50%)',
          height: BRACKET_HEIGHT,
          borderRadius: '6px 6px 0 0',
          background: '#1A0E08',
          zIndex: 2,
        }}
      />

      {/* ── 2. Light bar + bloom ─────────────────────────────────────
           Sits flush at bracket's bottom edge.
           clip-path: inset(0 0 -9999px 0) → top edge is hard-clipped,
           glow is physically impossible to travel upward.              */}
      <motion.div
        initial={{ width: '40%', opacity: 0 }}
        animate={{ width: '70%', opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'absolute',
          top: LIGHT_START,
          left: '50%',
          transform: 'translateX(-50%)',
          height: '4px',
          borderRadius: '0 0 4px 4px',
          background: 'linear-gradient(90deg, transparent, #FFE8CC 15%, #FFFFFF 50%, #FFE8CC 85%, transparent)',
          boxShadow: [
            '0  3px  12px  5px rgba(255,255,255,1.00)',
            '0  7px  28px 10px rgba(255,240,215,1.00)',
            '0 12px  55px 20px rgba(255,228,195,0.80)',
            '0 18px 100px 35px rgba(255,215,170,0.45)',
            '0 24px 140px 50px rgba(255,205,155,0.20)',
          ].join(', '),
          zIndex: 1,
        }}
      />

      {/* ── 3. Ambient wash ──────────────────────────────────────────
           Starts at LIGHT_START — not a pixel above.
           Near-white warm tones, not brown. Light on a white wall.    */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35, duration: 1.1, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          top: LIGHT_START,
          left: 0,
          right: 0,
          height: 280 - LIGHT_START,
          background: [
            'radial-gradient(',
            '  ellipse 95% 90% at 50% 0%,',
            '  rgba(255,242,225,1.00) 0%,',
            '  rgba(255,238,215,0.70) 30%,',
            '  rgba(255,232,205,0.30) 56%,',
            '  transparent 78%',
            ')',
          ].join(''),
        }}
      />
    </div>
  );
}
