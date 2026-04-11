import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { pageSlide } from '@/design/motion';
import ProgressBar from '@/components/ProgressBar';
import BackHeader from '@/components/BackHeader';
import { useNavigation } from './useNavigation';

interface Props {
  children: ReactNode;
  className?: string;
  hideProgress?: boolean;
  hideBack?: boolean;
}

export default function ScreenShell({
  children,
  className = '',
  hideProgress = false,
  hideBack = false,
}: Props) {
  const current = useNavigation((s) => s.current);

  return (
    <motion.div
      className={`flex min-h-[100dvh] w-full max-w-[480px] mx-auto flex-col px-5 bg-bg safe-top safe-bottom ${className}`}
      variants={pageSlide}
      initial="initial"
      animate="animate"
      exit="exit"
    >
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
