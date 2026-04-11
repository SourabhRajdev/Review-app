import type { ScreenId } from '@/screens/types';

const EASY_FLOW: ScreenId[] = ['swipeGame', 'conveyorBelt', 'bubblePop', 'vibeGame', 'serviceGame', 'slingshotGame'];
const HARD_FLOW: ScreenId[] = ['darts', 'stackTower', 'sparkSlice', 'basketball'];

interface Props {
  current: ScreenId;
}

export default function ProgressBar({ current }: Props) {
  let flow = EASY_FLOW;
  if (HARD_FLOW.includes(current)) flow = HARD_FLOW;
  else if (!EASY_FLOW.includes(current)) return null;

  const idx = flow.indexOf(current);
  if (idx === -1) return null;
  const total = flow.length;

  return (
    <div className="w-full mt-1">
      <div className="flex gap-1">
        {flow.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i <= idx ? 'bg-primary' : 'bg-ink-ghost/30'
            }`}
          />
        ))}
      </div>
      <p className="text-micro text-ink-tertiary mt-1.5 text-right tabular-nums">
        {idx + 1} of {total}
      </p>
    </div>
  );
}
