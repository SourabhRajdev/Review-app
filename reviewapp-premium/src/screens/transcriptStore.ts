// Store for voice transcript and AI toggle state
import { create } from 'zustand';

interface TranscriptStore {
  transcript: string;
  useAI: boolean;
  setTranscript: (text: string) => void;
  setUseAI: (use: boolean) => void;
  reset: () => void;
}

export const useTranscriptStore = create<TranscriptStore>((set) => ({
  transcript: '',
  useAI: true, // Default to AI mode
  setTranscript: (text) => set({ transcript: text }),
  setUseAI: (use) => set({ useAI: use }),
  reset: () => set({ transcript: '', useAI: true })
}));
