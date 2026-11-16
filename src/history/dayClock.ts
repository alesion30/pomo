import { FOCUS_SEC } from "../domain/constants";
import type { SessionRecord } from "../domain/record";
import { addDays, type RecordInput, startOfDay } from "./records";

const MINUTE_MS = 60_000;
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/** 「11月16日（月）」。今年でなければ年を前に付ける。 */
export function formatDay(day: Date, today: Date) {
  const label = `${day.getMonth() + 1}月${day.getDate()}日（${WEEKDAYS[day.getDay()]}）`;
  return day.getFullYear() === today.getFullYear()
    ? label
    : `${day.getFullYear()}年${label}`;
}

/** 一覧の 1 件に出す長さ。 */
export function formatMinutes(sec: number) {
  return `${Math.round(sec / 60)}分`;
}

/** 一日の合計に出す長さ。 */
export function formatTotal(sec: number) {
  const minutes = Math.round(sec / 60);
  const hours = Math.floor(minutes / 60);
  if (hours === 0) return `${minutes}分`;
  return minutes % 60 === 0 ? `${hours}時間` : `${hours}時間${minutes % 60}分`;
}

function atClock(day: Date, value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return Number.NaN;
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    Number(match[1]),
    Number(match[2]),
  ).getTime();
}

/**
 * 入力した「HH:MM」を、元の記録が始まった日の時刻にする。終了が開始より前の時刻なら、日付をまたいだ翌日の時刻として扱う。
 * 元の時刻と同じ分になったら、秒まで元の値を保つ。分に丸めると、タイトルだけの編集でも実際の時間が縮み、完了が途中終了に変わるため。
 */
export function resolveTimes(
  start: string,
  end: string,
  original: Pick<RecordInput, "startedAt" | "endedAt">,
) {
  const day = startOfDay(new Date(original.startedAt));
  const keep = (ms: number, kept: number) =>
    Math.floor(ms / MINUTE_MS) === Math.floor(kept / MINUTE_MS) ? kept : ms;
  return {
    startedAt: keep(atClock(day, start), original.startedAt),
    endedAt: keep(
      atClock(end < start ? addDays(day, 1) : day, end),
      original.endedAt,
    ),
  };
}

/**
 * 追加する記録の最初の値。今日は今を終了にした 25 分、過去の日はその日の最後の記録の続き（なければ 9 時）からの 25 分。
 * 開始はその日の 0 時より前にしない。前日に始まる記録は、開いている日の一覧に出ないため。
 */
export function defaultInput(
  day: Date,
  now: number,
  dayRecords: SessionRecord[],
): RecordInput {
  const from = startOfDay(day).getTime();
  const nextDay = addDays(day, 1).getTime();
  const length = FOCUS_SEC * 1000;
  let startedAt: number;
  let endedAt: number;
  if (now >= from && now < nextDay) {
    endedAt = Math.floor(now / MINUTE_MS) * MINUTE_MS;
    startedAt = Math.max(from, endedAt - length);
  } else {
    const lastEnd = Math.max(
      ...dayRecords.map((r) => Date.parse(r.ended_at)),
      Number.NEGATIVE_INFINITY,
    );
    const next = Math.ceil(lastEnd / MINUTE_MS) * MINUTE_MS;
    startedAt =
      next >= from && next + length <= nextDay ? next : atClock(day, "09:00");
    endedAt = startedAt + length;
  }
  return { title: "", category: "", notes: "", startedAt, endedAt };
}
