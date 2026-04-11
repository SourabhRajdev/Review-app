// GAME STORE — collects all signals from game rounds
// These signals feed into the AI review generation.

import { create } from 'zustand';

export type GameMode = 'easy' | 'hard' | null;

export interface SwipeAnswer {
  questionId: string;
  question: string;
  positive: boolean;
}

export interface SlingshotAnswer {
  questionId: string;
  question: string;
  positive: boolean;
  phrase: string;
}

export interface BasketballAnswer {
  questionId: string;
  question: string;
  selectedOption: string;
  scored: boolean;
  discount: number;
}

export type HardGameId = 'darts' | 'stackTower' | 'sparkSlice';

export interface HardGameResult {
  gameId: HardGameId;
  /** Signal key the game captured (e.g. 'occasion', 'vibe_chips', 'sensory_chips') */
  signalKey: string;
  /** Captured signal payload — string for single-value, string[] for chip lists */
  signalValue: string | string[];
  /** 0..100 skill score */
  scorePercent: number;
  /** 1..10 discount earned */
  discount: number;
}

interface GameStore {
  mode: GameMode;
  swipeAnswers: SwipeAnswer[];
  slingshotAnswers: SlingshotAnswer[];
  basketballAnswer: BasketballAnswer | null;
  hardGameResults: HardGameResult[];
  menuItems: string[];
  sensoryChips: string[];
  perfectFor: string | null;

  setMode: (mode: GameMode) => void;
  addSwipeAnswer: (answer: SwipeAnswer) => void;
  addSlingshotAnswer: (answer: SlingshotAnswer) => void;
  setBasketballAnswer: (answer: BasketballAnswer) => void;
  addHardGameResult: (result: HardGameResult) => void;
  setMenuItems: (items: string[]) => void;
  setSensoryChips: (chips: string[]) => void;
  setPerfectFor: (value: string) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  mode: null,
  swipeAnswers: [],
  slingshotAnswers: [],
  basketballAnswer: null,
  hardGameResults: [],
  menuItems: [],
  sensoryChips: [],
  perfectFor: null,

  setMode: (mode) => set({ mode }),
  addSwipeAnswer: (answer) =>
    set((s) => ({ swipeAnswers: [...s.swipeAnswers, answer] })),
  addSlingshotAnswer: (answer) =>
    set((s) => ({ slingshotAnswers: [...s.slingshotAnswers, answer] })),
  setBasketballAnswer: (answer) => set({ basketballAnswer: answer }),
  addHardGameResult: (result) =>
    set((s) => ({
      hardGameResults: [
        ...s.hardGameResults.filter((r) => r.gameId !== result.gameId),
        result,
      ],
    })),
  setMenuItems: (items) => set({ menuItems: items }),
  setSensoryChips: (chips) => set({ sensoryChips: chips }),
  setPerfectFor: (value) => set({ perfectFor: value }),
  reset: () =>
    set({
      mode: null,
      swipeAnswers: [],
      slingshotAnswers: [],
      basketballAnswer: null,
      hardGameResults: [],
      menuItems: [],
      sensoryChips: [],
      perfectFor: null,
    }),
}));
