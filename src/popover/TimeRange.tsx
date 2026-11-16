import { useEffect, useState } from "react";
import { plannedMinutes, type TimerState } from "../domain/timer";
import { formatClock, resolveStart } from "./clockTime";

type Running = Exclude<TimerState, { phase: "idle" }>;

/** 開始と予定の終了の時刻。押すと編集画面を開く。 */
export function TimeRange({
  timer,
  onEdit,
}: {
  timer: Running;
  onEdit(): void;
}) {
  const end = timer.startedAt + timer.plannedSec * 1000;
  return (
    <button
      type="button"
      className="time-range"
      data-testid="time-range"
      aria-label="開始と終了の時刻を編集"
      onClick={onEdit}
    >
      {formatClock(timer.startedAt)} → {formatClock(end)}
    </button>
  );
}

export function TimeEditDialog({
  timer,
  now,
  scale,
  onSave,
  onCancel,
}: {
  timer: Running;
  now: number;
  scale: number;
  onSave(startedAt: number, plannedMin: number): void;
  onCancel(): void;
}) {
  const minutes = plannedMinutes(timer, scale);
  const [start, setStart] = useState(formatClock(timer.startedAt));
  const [hours, setHours] = useState(String(Math.floor(minutes / 60)));
  const [mins, setMins] = useState(String(minutes % 60));
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onCancel]);
  const startedAt = resolveStart(start, timer.startedAt, now);
  const total = Number(hours) * 60 + Number(mins);
  const error =
    startedAt === null
      ? "開始は今より前の時刻にしてください。"
      : !Number.isInteger(total) || total < 1
        ? "時間は 1 分以上にしてください。"
        : null;
  return (
    <div className="scrim">
      <form
        className="dialog time-edit"
        data-testid="time-edit"
        role="dialog"
        aria-modal="true"
        aria-label="開始と時間の編集"
        onSubmit={(e) => {
          e.preventDefault();
          if (startedAt !== null && !error) onSave(startedAt, total);
        }}
      >
        <label className="time-edit-row">
          <span>開始</span>
          <input
            type="time"
            data-testid="time-start"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <div className="time-edit-row">
          <span>長さ</span>
          <input
            type="number"
            min={0}
            max={23}
            data-testid="time-hours"
            aria-label="時間（時）"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />
          <span className="unit">時間</span>
          <input
            type="number"
            min={0}
            max={59}
            data-testid="time-minutes"
            aria-label="時間（分）"
            value={mins}
            onChange={(e) => setMins(e.target.value)}
          />
          <span className="unit">分</span>
        </div>
        {error && (
          <small role="alert" className="alert" data-testid="time-error">
            {error}
          </small>
        )}
        <div className="dialog-actions">
          <button
            type="button"
            className="button"
            data-testid="time-cancel"
            onClick={onCancel}
          >
            キャンセル
          </button>
          <button
            type="submit"
            className="button primary"
            data-testid="time-save"
            disabled={error !== null}
          >
            保存
          </button>
        </div>
      </form>
    </div>
  );
}
