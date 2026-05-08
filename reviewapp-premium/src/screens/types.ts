export type ScreenId =
  | 'entry'
  | 'voiceEntry'
  | 'transcriptReview'
  // Easy mode games
  | 'aboutYou'
  | 'orderSelection'
  | 'productGame'
  | 'round2'
  | 'archery'
  | 'swipeGame'

  | 'conveyorBelt'
  | 'bubblePop'
  | 'vibeGame'
  | 'serviceGame'
  | 'slingshotGame'
  | 'shellGame'
  // Hard mode games
  | 'darts'
  | 'stackTower'
  | 'sparkSlice'
  | 'basketball'
  // Shared
  | 'spinWheel'
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
