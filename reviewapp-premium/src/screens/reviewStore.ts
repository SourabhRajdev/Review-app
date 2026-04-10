import { create } from 'zustand';

interface ReviewStore {
  text: string;
  setReview: (text: string) => void;
  updateText: (text: string) => void;
  reset: () => void;
}

export const useReviewStore = create<ReviewStore>((set) => ({
  text: '',
  setReview: (text) => set({ text }),
  updateText: (text) => set({ text }),
  reset: () => set({ text: '' })
}));
