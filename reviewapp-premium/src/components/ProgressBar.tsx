// Segmented progress bar — shows how far through the review flow the user is.
// Appears at the top of every screen except entry and review.

import { motion } from 'framer-motion';
import { spring } from '@/design/motion';
import type { ScreenId } from '@/screens/types';

// Ordered flow for progress calculation (excludes entry, voice path, generating, review)
const FLOW_SCREENS: ScreenId[] = [
  'visitType',
  'occasion',
  'menu',
  'sensoryChips',
  'experienceChoice',
  'disappointment',
  'returnChoice',
  'comparison',
  'bonus'
];

const TOTAL = FLOW_SCREENS.length;

interface Props {
  current: ScreenId;
}

export default function ProgressBar({ current }: Props) {
  const idx = FLOW_SCREENS.indexOf(current);
  if (idx === -1) return null;

  return (
    <div className="w-full px-1">
      <div className="flex gap-1">
        {FLOW_SCREENS.map((screen, i) => (
          <motion.div
            key={screen}
            className="h-[3px] flex-1 rounded-full overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.03 }}
          >
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{
                width: i <= idx ? '100%' : '0%',
                backgroundColor: i <= idx ? '#C67C4E' : 'transparent'
              }}
              transition={{ ...spring.snappy, delay: i * 0.02 }}
              style={{
                backgroundColor: i <= idx ? '#C67C4E' : 'rgba(60,36,21,0.08)'
              }}
            />
          </motion.div>
        ))}
      </div>
      <motion.p
        className="text-[11px] text-ink-quiet font-medium mt-2 text-right tabular-nums"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {idx + 1} of {TOTAL}
      </motion.p>
    </div>
  );
}
