// Back navigation header with chevron. Used on all screens except entry.

import { motion } from 'framer-motion';
import { useNavigation } from '@/screens/useNavigation';
import { tapScale } from '@/design/motion';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';

interface Props {
  label?: string;
}

export default function BackHeader({ label }: Props) {
  const back = useNavigation((s) => s.back);
  const previous = useNavigation((s) => s.previous);

  if (!previous) return null;

  return (
    <motion.button
      className="flex items-center gap-1.5 py-3 -ml-1 text-ink-muted cursor-pointer"
      onClick={() => {
        audio.tick();
        haptics.tick();
        back();
      }}
      whileTap={tapScale.whileTap}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>
      {label && (
        <span className="text-[14px] font-medium">{label}</span>
      )}
    </motion.button>
  );
}
