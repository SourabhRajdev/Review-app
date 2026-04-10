// Full-screen wrapper shared by all screens. Provides:
// - Warm gradient background
// - Progress bar (for flow screens)
// - Back navigation header
// - Max-width, padding, safe areas
// - AnimatePresence exit animation slot

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { slideUp } from '@/design/motion';
import ProgressBar from '@/components/ProgressBar';
import BackHeader from '@/components/BackHeader';
import { useNavigation } from './useNavigation';

interface Props {
  children: ReactNode;
  className?: string;
  /** Hide progress bar (entry, generating, review) */
  hideProgress?: boolean;
  /** Hide back button */
  hideBack?: boolean;
  /** Use hero gradient background */
  hero?: boolean;
}

export default function ScreenShell({
  children,
  className = '',
  hideProgress = false,
  hideBack = false,
  hero = false
}: Props) {
  const current = useNavigation((s) => s.current);

  return (
    <motion.div
      className={`
        flex min-h-[100dvh] w-full max-w-[480px] mx-auto flex-col px-6 safe-top safe-bottom
        ${hero ? 'bg-gradient-hero' : 'bg-surface'}
        ${className}
      `}
      variants={slideUp}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* Top bar: back + progress */}
      {(!hideProgress || !hideBack) && (
        <div className="pt-3 pb-1">
          {!hideBack && <BackHeader />}
          {!hideProgress && <ProgressBar current={current} />}
        </div>
      )}
      {children}
    </motion.div>
  );
}
