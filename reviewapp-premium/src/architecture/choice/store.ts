// CHOICE LAYER — store
//
// IMPORT RULE: choice/* may NOT import from engagement/* or reward/*.

import { create } from 'zustand';
import type {
  ChoiceSnapshot,
  VisitType,
  Occasion,
  ProductOpinion,
  ExperienceOpinion,
  ReturnIntent,
  VibeTag,
  RecommendFor,
  DisappointmentChip
} from './types';

interface ChoiceStore extends ChoiceSnapshot {
  setVisitType: (v: VisitType) => void;
  setOccasion: (o: Occasion) => void;
  toggleItem: (item: string) => void;
  setProductOpinion: (o: ProductOpinion) => void;
  setSensoryChips: (chips: string[]) => void;
  setExperienceOpinion: (o: ExperienceOpinion) => void;
  setDisappointment: (d: DisappointmentChip) => void;
  setReturnIntent: (r: ReturnIntent) => void;
  setComparisonChip: (c: string) => void;
  setVibeChips: (v: VibeTag[]) => void;
  setRecommendFor: (r: RecommendFor) => void;
  reset: () => void;
}

const INITIAL: ChoiceSnapshot = {
  visitType: null,
  occasion: null,
  itemsOrdered: [],
  productOpinion: null,
  sensoryChips: [],
  experienceOpinion: null,
  disappointment: null,
  returnIntent: null,
  comparisonChip: null,
  vibeChips: [],
  recommendFor: null
};

export const useChoiceStore = create<ChoiceStore>((set) => ({
  ...INITIAL,

  setVisitType: (v) => set({ visitType: v }),
  setOccasion: (o) => set({ occasion: o }),
  toggleItem: (item) =>
    set((s) => ({
      itemsOrdered: s.itemsOrdered.includes(item)
        ? s.itemsOrdered.filter((i) => i !== item)
        : [...s.itemsOrdered, item]
    })),
  setProductOpinion: (o) => set({ productOpinion: o }),
  setSensoryChips: (chips) => set({ sensoryChips: chips }),
  setExperienceOpinion: (o) => set({ experienceOpinion: o }),
  setDisappointment: (d) => set({ disappointment: d }),
  setReturnIntent: (r) => set({ returnIntent: r }),
  setComparisonChip: (c) => set({ comparisonChip: c }),
  setVibeChips: (v) => set({ vibeChips: v }),
  setRecommendFor: (r) => set({ recommendFor: r }),

  reset: () => set(INITIAL)
}));

export const selectProductOpinion = (s: ChoiceStore) => s.productOpinion;
