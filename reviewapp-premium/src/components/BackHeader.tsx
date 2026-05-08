import { motion } from 'framer-motion';
import { useNavigation } from '@/screens/useNavigation';
import { audio } from '@/design/audio';
import { haptics } from '@/design/haptics';

export default function BackHeader() {
  const back = useNavigation((s) => s.back);
  const previous = useNavigation((s) => s.previous);
  if (!previous) return null;

  return (
    <motion.button
      className="flex items-center gap-1.5 text-ink-secondary hover:text-primary transition-colors duration-150 cursor-pointer mb-1 -ml-1 px-1 py-1"
      onClick={() => { audio.tick(); haptics.tick(); back(); }}
      whileHover={{ x: -2 }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.15 }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      <span className="text-label font-semibold">Back</span>
    </motion.button>
  );
}
