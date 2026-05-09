import { create } from 'zustand';

export type LuckTier = 'cold' | 'warm' | 'hot' | 'fire';

interface LuckState {
  basketballLuck: number;  // 0 or 35
  slingshotLuck: number;   // 0–35 (proportional to positive ratio)
  cupGameLuck: number;     // 0 or 30
  totalLuck: number;       // 0–100
  tier: LuckTier;
  setBasketballLuck: (points: number) => void;
  setSlingshotLuck: (positiveRatio: number) => void;
  setCupGameLuck: (won: boolean) => void;
  reset: () => void;
}

function calcTier(total: number): LuckTier {
  if (total <= 25) return 'cold';
  if (total <= 50) return 'warm';
  if (total <= 75) return 'hot';
  return 'fire';
}

export const useLuckStore = create<LuckState>((set, get) => ({
  basketballLuck: 0,
  slingshotLuck: 0,
  cupGameLuck: 0,
  totalLuck: 0,
  tier: 'cold',

  setBasketballLuck: (points) => {
    const { slingshotLuck, cupGameLuck } = get();
    const total = points + slingshotLuck + cupGameLuck;
    set({ basketballLuck: points, totalLuck: total, tier: calcTier(total) });
  },

  setSlingshotLuck: (positiveRatio) => {
    const val = Math.round(positiveRatio * 35);
    const { basketballLuck, cupGameLuck } = get();
    const total = basketballLuck + val + cupGameLuck;
    set({ slingshotLuck: val, totalLuck: total, tier: calcTier(total) });
  },

  setCupGameLuck: (won) => {
    const val = won ? 30 : 0;
    const { basketballLuck, slingshotLuck } = get();
    const total = basketballLuck + slingshotLuck + val;
    set({ cupGameLuck: val, totalLuck: total, tier: calcTier(total) });
  },

  reset: () => set({ basketballLuck: 0, slingshotLuck: 0, cupGameLuck: 0, totalLuck: 0, tier: 'cold' }),
}));
