// Thin wrapper around the Vibration API. Silently no-ops on devices
// that don't support it (notably iOS Safari, which still doesn't ship
// navigator.vibrate). The intent here is "if the platform can give the
// user a tactile nudge, take it; otherwise the visuals + audio carry it."

const supported =
  typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

function vibrate(pattern: number | number[]) {
  if (!supported) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}

export const haptics = {
  /** A barely-there confirmation. Use on selection / chip tap. */
  tick: () => vibrate(8),
  /** A solid press. Use on primary button activation. */
  press: () => vibrate(14),
  /** Two-pulse acknowledgement. Use on stage transitions. */
  bump: () => vibrate([10, 24, 10]),
  /** A satisfying impact. Use on game hit / reward reveal. */
  impact: () => vibrate([18, 8, 26]),
  /** A jackpot pattern. Reserve for the highest reward tier. */
  jackpot: () => vibrate([10, 30, 10, 30, 40]),

  // --- Game-specific tactile patterns ---

  /** Quick crispy snap. Use on slicing / clean cuts. */
  slice: () => vibrate([5, 4, 14]),
  /** Solid landing thunk. Use when a block / dart lands clean. */
  land: () => vibrate([22, 4, 12]),
  /** Bright bouncy pattern. Use on perfect alignment / bullseye. */
  perfect: () => vibrate([8, 12, 8, 12, 22]),
  /** Single dull thud. Use on misses / penalties / wrong slice. */
  miss: () => vibrate([34]),
  /** Three-quick pulse. Use to signal a slice combo / streak. */
  combo: () => vibrate([6, 6, 6, 6, 6]),
  /** A drawn-out pulse. Use during sustained drag (dart aim, bow draw). */
  drag: () => vibrate(4),
};
