export type RecordKind = "focus" | "short_break" | "long_break";
export type Outcome = "completed" | "ended_early";

export type SessionRecord = {
  id: string;
  kind: RecordKind;
  title: string | null;
  category: string | null;
  notes: string | null;
  started_at: string;
  ended_at: string;
  planned_sec: number;
  actual_sec: number;
  outcome: Outcome;
};

export function localIso8601(epochMs: number): string {
  const date = new Date(epochMs);
  const pad = (value: number) => String(value).padStart(2, "0");
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const zone = `${sign}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${zone}`;
}

export function makeRecord(
  input: Omit<SessionRecord, "id" | "started_at" | "ended_at"> & {
    startedAt: number;
    endedAt: number;
  },
): SessionRecord {
  const { startedAt, endedAt, ...record } = input;
  return {
    ...record,
    id: crypto.randomUUID(),
    started_at: localIso8601(startedAt),
    ended_at: localIso8601(endedAt),
  };
}
