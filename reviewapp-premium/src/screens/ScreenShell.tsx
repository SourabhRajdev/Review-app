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
      className="fixed inset-0 overflow-y-auto bg-bg"
      variants={pageSlide}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className={`flex min-h-full w-full max-w-[480px] mx-auto flex-col px-5 safe-top safe-bottom ${className}`}>
        {(!hideProgress || !hideBack) && (
          <div className="pt-3 pb-1">
            {!hideBack && <BackHeader />}
            {!hideProgress && <ProgressBar current={current} />}
          </div>
        )}
        {children}
      </div>
    </motion.div>
  );
}
