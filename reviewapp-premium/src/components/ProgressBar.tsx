import { motion } from 'framer-motion';
import type { ScreenId } from '@/screens/types';

const EASY_FLOW: ScreenId[] = ['swipeGame', 'conveyorBelt', 'bubblePop', 'vibeGame', 'serviceGame', 'slingshotGame'];
const HARD_FLOW: ScreenId[] = ['darts', 'stackTower', 'sparkSlice', 'basketball'];

interface Props { current: ScreenId; }

export default function ProgressBar({ current }: Props) {
  let flow = EASY_FLOW;
  if (HARD_FLOW.includes(current)) flow = HARD_FLOW;
  else if (!EASY_FLOW.includes(current)) return null;

  const idx = flow.indexOf(current);
  if (idx === -1) return null;
  const total = flow.length;

  return (
    <div className="w-full mt-1">
      <div className="flex gap-1.5">
        {flow.map((_, i) => {
          const isCompleted = i < idx;
          const isCurrent = i === idx;

          return (
            <div key={i} className="relative flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(200,170,140,0.2)' }}>
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: isCompleted || isCurrent ? '100%' : '0%' }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: isCurrent ? 0.1 : 0 }}
                style={isCurrent ? {
                  background: 'linear-gradient(90deg, #E8B896, #C67C4E)',
                  boxShadow: '0 0 6px rgba(198,124,78,0.5)',
                } : isCompleted ? {
                  background: '#C67C4E',
                  opacity: 0.7,
                } : {}}
              />
            </div>
          );
        })}
      </div>
      <p className="text-micro text-ink-tertiary mt-1.5 text-right tabular-nums">
        {idx + 1} <span className="opacity-40">/</span> {total}
      </p>
    </div>
  );
}
