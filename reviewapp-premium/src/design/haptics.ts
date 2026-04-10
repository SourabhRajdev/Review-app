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
  jackpot: () => vibrate([10, 30, 10, 30, 40])
};
