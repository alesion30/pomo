export const FOCUS_SEC = 25 * 60;
export const SHORT_BREAK_SEC = 5 * 60;
export const LONG_BREAK_SEC = 20 * 60;
export const LONG_EVERY = 4;
export const ADJUST_SEC = 5 * 60;
export const MIN_PLANNED_SEC = 5 * 60;
export const STREAK_GAP_SEC = 60 * 60;

export function durations(scale = 1) {
  return {
    focus: FOCUS_SEC / scale,
    shortBreak: SHORT_BREAK_SEC / scale,
    longBreak: LONG_BREAK_SEC / scale,
    adjust: ADJUST_SEC / scale,
    minimum: MIN_PLANNED_SEC / scale,
    streakGapMs: (STREAK_GAP_SEC * 1000) / scale,
  };
}
