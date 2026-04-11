// BlurFade — word-by-word blur-fade reveal for headings.
// Adapted from magicui/21st.dev. Uses framer-motion only.

import { motion, type Variants } from 'framer-motion';

interface BlurFadeProps {
  /** The text to reveal word-by-word */
  text: string;
  /** Base delay before the animation starts */
  delay?: number;
  /** Stagger between words (seconds) */
  stagger?: number;
  /** Blur radius for the hidden state */
  blur?: string;
  /** Vertical offset for the hidden state */
  yOffset?: number;
  /** Duration per word */
  duration?: number;
  /** Additional className on the container */
  className?: string;
  /** Render as which HTML element (unused, kept for API compat) */
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
}

export default function BlurFade({
  text,
  delay = 0,
  stagger = 0.04,
  blur = '8px',
  yOffset = 8,
  duration = 0.4,
  className = '',
}: BlurFadeProps) {
  const words = text.split(' ');

  const container: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: stagger,
        delayChildren: delay,
      },
    },
  };

  const child: Variants = {
    hidden: {
      opacity: 0,
      y: yOffset,
      filter: `blur(${blur})`,
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        duration,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  };

  return (
    <motion.div
      className={className}
      variants={container}
      initial="hidden"
      animate="visible"
      role="heading"
      aria-label={text}
    >
      {words.map((word, i) => (
        <motion.span
          key={i}
          className="inline-block"
          variants={child}
          style={{ marginRight: '0.3em' }}
        >
          {word}
        </motion.span>
      ))}
    </motion.div>
  );
}
