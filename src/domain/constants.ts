export const FOCUS_SEC = 25 * 60;
export const SHORT_BREAK_SEC = 5 * 60;
export const LONG_BREAK_SEC = 20 * 60;
export const LONG_EVERY = 4;
export const ADJUST_SEC = 5 * 60;
export const MIN_PLANNED_SEC = 5 * 60;
export const STREAK_GAP_SEC = 60 * 60;

// 予定時刻を整数ミリ秒に保つため、縮めた時間も整数秒にそろえる。
function scaled(sec: number, scale: number) {
  return Math.max(1, Math.round(sec / scale));
}

export function durations(scale = 1) {
  return {
    focus: scaled(FOCUS_SEC, scale),
    shortBreak: scaled(SHORT_BREAK_SEC, scale),
    longBreak: scaled(LONG_BREAK_SEC, scale),
    adjust: scaled(ADJUST_SEC, scale),
    minimum: scaled(MIN_PLANNED_SEC, scale),
    streakGapMs: scaled(STREAK_GAP_SEC, scale) * 1000,
  };
}
