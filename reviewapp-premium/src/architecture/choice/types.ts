// CHOICE LAYER — types
//
// IMPORT RULE: choice/* may NOT import from engagement/* or reward/*.
// This is the ONLY source of truth for review data.

export type VisitType = 'first_time' | 'returning';

export type Occasion =
  | 'work_break'
  | 'morning_routine'
  | 'catching_up'
  | 'treating_myself'
  | 'date'
  | 'first_try';

export type ProductOpinion = 'loved' | 'okay' | 'not_great';
export type ExperienceOpinion = 'smooth' | 'okay' | 'could_be_better';
export type ReturnIntent = 'maybe' | 'will_return' | 'new_regular';

export type VibeTag =
  | 'cozy'
  | 'work_friendly'
  | 'quiet'
  | 'energizing'
  | 'great_music'
  | 'instagram_worthy'
  | 'social';

export type RecommendFor =
  | 'solo_work'
  | 'friends'
  | 'date'
  | 'family'
  | 'quick_break';

export type DisappointmentChip =
  | 'nothing_perfect'
  | 'wait_long'
  | 'could_be_quieter'
  | 'portion_size'
  | 'temperature'
  | 'staff_unremarkable';

export interface SensoryChip {
  id: string;
  label: string;
}

export interface ChoiceSnapshot {
  visitType: VisitType | null;
  occasion: Occasion | null;
  itemsOrdered: string[];
  productOpinion: ProductOpinion | null;
  sensoryChips: string[];
  experienceOpinion: ExperienceOpinion | null;
  disappointment: DisappointmentChip | null;
  returnIntent: ReturnIntent | null;
  comparisonChip: string | null;
  vibeChips: VibeTag[];
  recommendFor: RecommendFor | null;
}
