// Motion presets — warm, tactile, premium feel.
//
//   - `gentle`  → page transitions, large layout moves
//   - `snappy`  → tap response, button presses
//   - `bouncy`  → reward feedback, satisfying impacts
//   - `taut`    → drag follow-through (low overshoot)

import type { Transition, Variants } from 'framer-motion';

export const spring = {
  gentle: { type: 'spring', stiffness: 220, damping: 28, mass: 0.9 },
  snappy: { type: 'spring', stiffness: 380, damping: 30, mass: 0.8 },
  bouncy: { type: 'spring', stiffness: 260, damping: 14, mass: 1 },
  taut: { type: 'spring', stiffness: 500, damping: 40, mass: 0.6 }
} satisfies Record<string, Transition>;

export const ease = {
  out: [0.16, 1, 0.3, 1] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
  in: [0.7, 0, 0.84, 0] as const
};

export const duration = {
  fast: 0.18,
  base: 0.32,
  slow: 0.6,
  page: 0.7
};

// --- Reusable Variants ---

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: duration.base, ease: ease.out } },
  exit: { opacity: 0, transition: { duration: duration.fast, ease: ease.out } }
};

export const slideUp: Variants = {
  initial: { opacity: 0, y: 24 },
  animate: {
    opacity: 1,
    y: 0,
    transition: spring.gentle
  },
  exit: {
    opacity: 0,
    y: -12,
    transition: { duration: duration.fast, ease: ease.out }
  }
};

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.92 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: spring.snappy
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: duration.fast, ease: ease.out }
  }
};

export const tapScale = {
  whileTap: { scale: 0.96 },
  transition: spring.snappy
};

// Stagger container — wrap children items with staggerChildren
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.15
    }
  }
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: spring.snappy
  }
};

// Chip selection — scale bounce on select
export const chipSelect: Variants = {
  idle: { scale: 1 },
  selected: {
    scale: [1, 1.08, 1],
    transition: { duration: 0.3, times: [0, 0.4, 1] }
  }
};
