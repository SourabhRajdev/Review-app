import { create } from 'zustand';
import type { ScreenId } from './types';

interface NavStore {
  current: ScreenId;
  previous: ScreenId | null;
  go: (screen: ScreenId) => void;
  back: () => void;
}

export const useNavigation = create<NavStore>((set, get) => ({
  current: 'entry',
  previous: null,
  go: (screen) => set({ current: screen, previous: get().current }),
  back: () => {
    const prev = get().previous;
    if (prev) set({ current: prev, previous: null });
  }
}));
