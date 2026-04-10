// ENGAGEMENT LAYER — types
//
// IMPORT RULE: engagement/* may NOT import from choice/* or reward/*.

export interface ArcheryTelemetry {
  drawTimeMs: number;
  drawPower: number;
  hitDistance: number;
  ring: 'bullseye' | 'inner' | 'middle' | 'outer' | 'miss';
}

export interface BowlingTelemetry {
  swipeSpeedPx: number;
  swipeAngleDeg: number;
  pinsKnocked: number;
}

export interface PuttTelemetry {
  pullDistance: number;
  releaseAngleDeg: number;
  distanceToHole: number;
  holed: boolean;
}

export interface EngagementSnapshot {
  archery: ArcheryTelemetry | null;
  archeryComplete: boolean;
  bowling: BowlingTelemetry | null;
  bowlingComplete: boolean;
  putt: PuttTelemetry | null;
  puttComplete: boolean;
}
