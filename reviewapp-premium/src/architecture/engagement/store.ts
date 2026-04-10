// ENGAGEMENT LAYER — store
//
// IMPORT RULE: engagement/* may NOT import from choice/* or reward/*.

import { create } from 'zustand';
import type {
  EngagementSnapshot,
  ArcheryTelemetry,
  BowlingTelemetry,
  PuttTelemetry
} from './types';

interface EngagementStore extends EngagementSnapshot {
  commitArchery: (t: ArcheryTelemetry) => void;
  commitBowling: (t: BowlingTelemetry) => void;
  commitPutt: (t: PuttTelemetry) => void;
  reset: () => void;
}

const INITIAL: EngagementSnapshot = {
  archery: null,
  archeryComplete: false,
  bowling: null,
  bowlingComplete: false,
  putt: null,
  puttComplete: false
};

export const useEngagementStore = create<EngagementStore>((set) => ({
  ...INITIAL,
  commitArchery: (t) => set({ archery: t, archeryComplete: true }),
  commitBowling: (t) => set({ bowling: t, bowlingComplete: true }),
  commitPutt: (t) => set({ putt: t, puttComplete: true }),
  reset: () => set(INITIAL)
}));

export const selectArchery = (s: EngagementStore) => s.archery;
export const selectArcheryComplete = (s: EngagementStore) => s.archeryComplete;
export const selectBowling = (s: EngagementStore) => s.bowling;
export const selectPutt = (s: EngagementStore) => s.putt;
