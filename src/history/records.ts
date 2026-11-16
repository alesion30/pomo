import { localIso8601, type SessionRecord } from "../domain/record";

/** 記録の入力欄で編集できる項目。時刻はエポックミリ秒。 */
export type RecordInput = {
  title: string;
  category: string;
  notes: string;
  startedAt: number;
  endedAt: number;
};

/** その日（ローカル時刻の 0 時から翌 0 時まで）に始まった集中の記録を、開始の新しい順に返す。休憩は出さない。 */
export function focusOfDay(records: SessionRecord[], day: Date) {
  const from = startOfDay(day).getTime();
  const to = addDays(day, 1).getTime();
  return records
    .filter((r) => r.kind === "focus")
    .filter((r) => {
      const t = Date.parse(r.started_at);
      return t >= from && t < to;
    })
    .sort((a, b) => Date.parse(b.started_at) - Date.parse(a.started_at));
}

export function totalSec(records: SessionRecord[]) {
  return records.reduce((sum, r) => sum + r.actual_sec, 0);
}

export function startOfDay(day: Date) {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate());
}

export function addDays(day: Date, delta: number) {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate() + delta);
}

/** 入力に誤りがあれば理由を返す。 */
export function validate(input: RecordInput, now: number): string | null {
  if (!Number.isFinite(input.startedAt) || !Number.isFinite(input.endedAt))
    return "開始と終了の時刻を入れてください。";
  if (input.endedAt <= input.startedAt)
    return "終了は開始より後にしてください。";
  if (input.endedAt > now) return "終了は今より前にしてください。";
  return null;
}

/**
 * 手で足した記録は、予定どおりに終えた集中として残す。予定時間がないので、実際の時間をそのまま予定時間にする。
 * 編集では予定時間を保ち、実際の時間と完了したかを時刻から数え直す。
 */
export function toRecord(
  input: RecordInput,
  base?: SessionRecord,
): SessionRecord {
  // 時刻を変えていなければ実際の時間と結果を保つ。記録の時刻は秒に切り捨てた文字列なので、数え直すと 1 秒ずれることがある。
  const sameTimes =
    base !== undefined &&
    Date.parse(base.started_at) === input.startedAt &&
    Date.parse(base.ended_at) === input.endedAt;
  const actual = sameTimes
    ? base.actual_sec
    : Math.floor((input.endedAt - input.startedAt) / 1000);
  const planned = base?.planned_sec ?? actual;
  return {
    id: base?.id ?? crypto.randomUUID(),
    kind: "focus",
    title: input.title.trim(),
    category: input.category,
    notes: input.notes,
    started_at: localIso8601(input.startedAt),
    ended_at: localIso8601(input.endedAt),
    planned_sec: planned,
    actual_sec: actual,
    outcome: sameTimes
      ? base.outcome
      : actual >= planned
        ? "completed"
        : "ended_early",
  };
}

export function toInput(record: SessionRecord): RecordInput {
  return {
    title: record.title ?? "",
    category: record.category ?? "",
    notes: record.notes ?? "",
    startedAt: Date.parse(record.started_at),
    endedAt: Date.parse(record.ended_at),
  };
}
