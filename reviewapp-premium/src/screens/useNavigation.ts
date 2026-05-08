import { create } from 'zustand';
import type { ScreenId } from './types';

// Ordered flow for direction detection
const FLOW_ORDER: ScreenId[] = [
  'entry', 'aboutYou', 'orderSelection', 'productGame', 'round2', 'basketball', 'vibeGame', 'slingshotGame',
  'shellGame', 'spinWheel',
  'voiceEntry', 'transcriptReview',
  'swipeGame', 'conveyorBelt', 'bubblePop', 'serviceGame',
  'darts', 'stackTower', 'sparkSlice',
  'generating', 'review'
];

interface NavStore {
  current: ScreenId;
  previous: ScreenId | null;
  /** 1 = forward, -1 = back */
  direction: number;
  go: (screen: ScreenId) => void;
  back: () => void;
}

export const useNavigation = create<NavStore>((set, get) => ({
  current: 'entry',
  previous: null,
  direction: 1,
  go: (screen) => {
    const cur = get().current;
    console.log('🔀 [useNavigation] go() called');
    console.log('🔀 [useNavigation] From:', cur, '→ To:', screen);
    
    const curIdx = FLOW_ORDER.indexOf(cur);
    const nextIdx = FLOW_ORDER.indexOf(screen);
    const dir = nextIdx >= curIdx ? 1 : -1;
    
    set({ current: screen, previous: cur, direction: dir });
    
    console.log('✅ [useNavigation] State updated, current is now:', get().current);
  },
  back: () => {
    const prev = get().previous;
    if (prev) set({ current: prev, previous: null, direction: -1 });
  }
}));
