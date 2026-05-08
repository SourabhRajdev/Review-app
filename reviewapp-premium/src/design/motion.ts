// Motion presets — restrained, intentional.
// Two springs, one fade, directional slides, stagger containers.

import type { Transition, Variants } from 'framer-motion';

export const spring = {
  /** Page transitions, layout shifts */
  gentle: { type: 'spring', stiffness: 300, damping: 30 } satisfies Transition,
  /** Button response, small interactions */
  snappy: { type: 'spring', stiffness: 400, damping: 30 } satisfies Transition,
};

export const duration = {
  instant: 0.08,
  fast: 0.15,
  base: 0.25,
  slow: 0.4,
  deliberate: 0.6,
};

export const ease = {
  /** Decelerate into rest — most common */
  out: [0.16, 1, 0.3, 1] as const,
  /** Spring overshoot — chip/badge reveals */
  spring: [0.34, 1.56, 0.64, 1] as const,
  /** Symmetrical — deliberate transitions */
  inOut: [0.76, 0, 0.24, 1] as const,
};

// --- Reusable Variants ---

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: duration.base, ease: ease.out } },
  exit:    { opacity: 0, transition: { duration: duration.fast } },
};

/** Vertical page entrance — kept for any screen that doesn't use directional slide */
export const pageSlide: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: duration.base, ease: ease.out } },
  exit:    { opacity: 0,        transition: { duration: duration.fast } },
};

/** Horizontal directional slide — used by ScreenShell.
 *  Pass `custom={direction}` where direction: 1 = forward, -1 = back. */
export const directionSlide: Variants = {
  initial: (direction: number) => ({ opacity: 0, x: direction > 0 ? 24 : -24 }),
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -12 : 12,
    transition: { duration: 0.15 },
  }),
};

/** Staggered list item — slides up from 12px below, fades in */
export const slideUp: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: duration.slow, ease: ease.out } },
  exit:    { opacity: 0, y: 8,  transition: { duration: duration.fast } },
};

/** Container variant for staggering child slideUp animations */
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.04,
    },
  },
};

/** Scale in from 94% with opacity — for modals, cards, game results */
export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.94 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: duration.slow, ease: ease.spring },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: { duration: duration.fast },
  },
};

export const tapScale = {
  whileTap: { scale: 0.97 },
  transition: spring.snappy,
};
