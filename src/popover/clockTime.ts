const HOUR_MS = 3_600_000;

/** 24 時間表記の「HH:MM」。メニューバーの表記とそろえる。 */
export function formatClock(ms: number) {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * 入力した「HH:MM」を開始時刻にする。時刻を変えていなければ、秒まで元の開始時刻を保つ。
 * 今より後の時刻は、12 時間より先なら日付をまたいだ前日として扱い、それ以外は入力の誤りとして null を返す。
 */
export function resolveStart(value: string, original: number, now: number) {
  if (value === formatClock(original)) return original;
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const start = new Date(now);
  start.setHours(Number(match[1]), Number(match[2]), 0, 0);
  const ms = start.getTime();
  if (ms <= now) return ms;
  return ms - now > 12 * HOUR_MS ? ms - 24 * HOUR_MS : null;
}
