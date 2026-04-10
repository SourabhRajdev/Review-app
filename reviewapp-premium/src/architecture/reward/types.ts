// REWARD LAYER — types
//
// IMPORT RULE: reward/* may import from engagement/* (reads telemetry)
// but NEVER from choice/*. Rewards are pure functions of how well the
// user played the game, not what opinion they expressed.

export type RewardTier = 'bronze' | 'silver' | 'gold' | 'jackpot';

export interface RewardSnapshot {
  /** Normalized luck progress 0..1. Feeds the visual luck bar. */
  luckProgress: number;
  /** The tier the user earned this session. */
  tier: RewardTier | null;
  /** Whether the reward has been revealed to the user. */
  revealed: boolean;
}
