// REWARD LAYER — store
//
// IMPORT RULE: reward/* may import from engagement/* but NEVER from choice/*.

import { create } from 'zustand';
import type { RewardSnapshot, RewardTier } from './types';
import type { ArcheryTelemetry, BowlingTelemetry, PuttTelemetry } from '../engagement/types';

interface RewardStore extends RewardSnapshot {
  computeFromArchery: (t: ArcheryTelemetry) => void;
  computeFromBowling: (t: BowlingTelemetry) => void;
  computeFromPutt: (t: PuttTelemetry) => void;
  reveal: () => void;
  reset: () => void;
}

function tierFromScore(score: number): RewardTier {
  if (score > 0.85) return 'jackpot';
  if (score > 0.6) return 'gold';
  if (score > 0.35) return 'silver';
  return 'bronze';
}

export const useRewardStore = create<RewardStore>((set, get) => ({
  luckProgress: 0,
  tier: null,
  revealed: false,

  computeFromArchery: (t) => {
    const accuracy = Math.max(0, 1 - t.hitDistance);
    const commitment = Math.min(1, t.drawTimeMs / 2000) * 0.2;
    const score = accuracy * 0.8 + commitment;
    const prev = get().luckProgress;
    const newLuck = Math.min(1, prev + score * 0.34);
    set({ luckProgress: newLuck, tier: tierFromScore(newLuck) });
  },

  computeFromBowling: (t) => {
    const pinScore = t.pinsKnocked / 10;
    const prev = get().luckProgress;
    const newLuck = Math.min(1, prev + pinScore * 0.33);
    set({ luckProgress: newLuck, tier: tierFromScore(newLuck) });
  },

  computeFromPutt: (t) => {
    const holeBonus = t.holed ? 1 : Math.max(0, 1 - t.distanceToHole / 3);
    const prev = get().luckProgress;
    const newLuck = Math.min(1, prev + holeBonus * 0.33);
    set({ luckProgress: newLuck, tier: tierFromScore(newLuck) });
  },

  reveal: () => set({ revealed: true }),
  reset: () => set({ luckProgress: 0, tier: null, revealed: false })
}));

export const selectLuck = (s: RewardStore) => s.luckProgress;
export const selectTier = (s: RewardStore) => s.tier;
export const selectRevealed = (s: RewardStore) => s.revealed;
