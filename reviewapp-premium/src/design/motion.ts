// Motion presets — restrained, intentional.
// Two springs, one fade, one tap response. That's it.

import type { Transition, Variants } from 'framer-motion';

export const spring = {
  /** Page transitions, layout shifts */
  gentle: { type: 'spring', stiffness: 300, damping: 30 } satisfies Transition,
  /** Button response, small interactions */
  snappy: { type: 'spring', stiffness: 400, damping: 30 } satisfies Transition,
};

export const duration = {
  fast: 0.15,
  base: 0.25,
};

export const ease = {
  out: [0.16, 1, 0.3, 1] as const,
};

// --- Reusable Variants ---

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: duration.base, ease: ease.out } },
  exit: { opacity: 0, transition: { duration: duration.fast } },
};

export const pageSlide: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: duration.base, ease: ease.out } },
  exit: { opacity: 0, transition: { duration: duration.fast } },
};

export const tapScale = {
  whileTap: { scale: 0.97 },
  transition: spring.snappy,
};
