import { motion } from 'framer-motion';
import { useNavigation } from '@/screens/useNavigation';
import { tapScale } from '@/design/motion';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';

export default function BackHeader() {
  const back = useNavigation((s) => s.back);
  const previous = useNavigation((s) => s.previous);

  if (!previous) return null;

  return (
    <motion.button
      className="flex items-center gap-1 py-2 -ml-1 text-ink-secondary cursor-pointer"
      onClick={() => {
        audio.tick();
        haptics.tick();
        back();
      }}
      whileTap={tapScale.whileTap}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      <span className="text-body-sm font-medium">Back</span>
    </motion.button>
  );
}
