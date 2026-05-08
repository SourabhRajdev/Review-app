import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import ProgressBar from '@/components/ProgressBar';
import BackHeader from '@/components/BackHeader';
import { useNavigation } from './useNavigation';

interface Props {
  children: ReactNode;
  className?: string;
  hideProgress?: boolean;
  hideBack?: boolean;
  onBack?: () => void;
}

export default function ScreenShell({ children, className = '', hideProgress = false, hideBack = false }: Props) {
  const current = useNavigation((s) => s.current);
  const direction = useNavigation((s) => s.direction);

  return (
    <motion.div
      className="fixed inset-0 overflow-y-auto"
      style={{
        background: 'radial-gradient(ellipse 80% 50% at 50% -5%, rgba(198,124,78,0.06) 0%, transparent 55%), radial-gradient(ellipse 40% 30% at 85% 90%, rgba(232,184,150,0.04) 0%, transparent 50%), #FAF9F7',
      }}
      initial={{ opacity: 0, x: direction > 0 ? 28 : -28 }}
      animate={{ opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } }}
      exit={{ opacity: 0, x: direction > 0 ? -16 : 16, transition: { duration: 0.18 } }}
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
