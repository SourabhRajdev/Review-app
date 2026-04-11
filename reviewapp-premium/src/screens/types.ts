export type ScreenId =
  | 'entry'
  | 'voiceEntry'
  | 'transcriptReview'
  // Easy mode games
  | 'swipeGame'
  | 'conveyorBelt'
  | 'bubblePop'
  | 'vibeGame'
  | 'serviceGame'
  | 'slingshotGame'
  // Hard mode games
  | 'darts'
  | 'stackTower'
  | 'sparkSlice'
  | 'basketball'
  // Shared
  | 'generating'
  | 'review'
  // Legacy (kept, not in active flow)
  | 'visitType'
  | 'occasion'
  | 'menu'
  | 'sensoryChips'
  | 'experienceChoice'
  | 'disappointment'
  | 'returnChoice'
  | 'comparison'
  | 'bonus';
