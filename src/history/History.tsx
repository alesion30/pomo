import { type ReactNode, useEffect, useState } from "react";
import { ConfirmDialog } from "../ConfirmDialog";
import type { SessionRecord } from "../domain/record";
import { formatClock } from "../popover/clockTime";
import { type Colors, hueOf } from "../ui/categoryColor";
import {
  defaultInput,
  formatDay,
  formatMinutes,
  formatTotal,
} from "./dayClock";
import { RecordForm } from "./RecordForm";
import {
  addDays,
  focusOfDay,
  type RecordInput,
  startOfDay,
  toInput,
  toRecord,
  totalSec,
} from "./records";
import { useRecords } from "./useRecords";

const DAY_MS = 86_400_000;
export function History({
  now,
  categories,
  colors,
  onClose,
}: {
  now: number;
  categories: string[];
  colors: Colors;
  onClose(): void;
}) {
  const { records, error, put, remove } = useRecords();
  // null は今日。日付が変わっても今日を追うよう、今日だけは日付で持たない。
  const [picked, setPicked] = useState<Date | null>(null);
  const [form, setForm] = useState<{
    base: SessionRecord | null;
    initial: RecordInput;
  } | null>(null);
  const [deleting, setDeleting] = useState<SessionRecord | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const today = startOfDay(new Date(now));
  const day = picked ?? today;
  const isToday = picked === null;
  const dayRecords = focusOfDay(records ?? [], day);
  const dayLabel = formatDay(day, today);
  const overlay = form !== null || deleting !== null;
  // Esc は一番上の重なりだけを閉じる。入力と画面が別々に聞くと、1 回で両方閉じてしまう。
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.isComposing) return;
      if (overlay) {
        setForm(null);
        setDeleting(null);
      } else onClose();
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [overlay, onClose]);
  const move = (delta: number) => {
    const next = addDays(day, delta);
    setPicked(next.getTime() >= today.getTime() ? null : next);
  };
  const dayStart = day.getTime();
  const shownError = deleteError ?? error;
  return (
    <main className="history" data-testid="history" data-tone="idle">
      {form && (
        <RecordForm
          heading={form.base ? "記録を編集" : "記録を追加"}
          dayLabel={dayLabel}
          initial={form.initial}
          now={now}
          categories={categories}
          colors={colors}
          onSave={(input) =>
            put(toRecord(input, form.base ?? undefined)).then(() =>
              setForm(null),
            )
          }
          onCancel={() => setForm(null)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          name="delete-record"
          message="この記録を削除しますか？"
          detail={`${deleting.title || "（タイトルなし）"}　${formatClock(Date.parse(deleting.started_at))}–${formatClock(Date.parse(deleting.ended_at))}。元に戻せません。`}
          okLabel="削除する"
          onConfirm={() => {
            setDeleting(null);
            setDeleteError(null);
            remove(deleting.id).catch((reason: unknown) =>
              setDeleteError(`削除に失敗しました: ${String(reason)}`),
            );
          }}
          onCancel={() => setDeleting(null)}
        />
      )}
      <header className="history-head">
        <h1 className="screen-title">履歴</h1>
        <div className="history-tools">
          <button
            type="button"
            className="history-add"
            data-testid="history-add"
            disabled={records === null}
            onClick={() =>
              setForm({
                base: null,
                initial: defaultInput(day, now, dayRecords),
              })
            }
          >
            ＋ 追加
          </button>
          <button
            type="button"
            className="icon-button"
            data-testid="history-close"
            aria-label="履歴を閉じる"
            onClick={onClose}
          >
            <Icon>
              <path d="M18 6 6 18M6 6l12 12" />
            </Icon>
          </button>
        </div>
      </header>
      <div className="history-nav">
        <div className="history-nav-day">
          <button
            type="button"
            className="icon-button"
            data-testid="history-prev"
            aria-label="前の日"
            onClick={() => move(-1)}
          >
            <Icon>
              <polyline points="15 18 9 12 15 6" />
            </Icon>
          </button>
          <span className="history-date" data-testid="history-date">
            {dayLabel}
          </span>
          <button
            type="button"
            className="icon-button"
            data-testid="history-next"
            aria-label="次の日"
            disabled={isToday}
            onClick={() => move(1)}
          >
            <Icon>
              <polyline points="9 18 15 12 9 6" />
            </Icon>
          </button>
        </div>
        {isToday ? (
          <span className="history-today">今日</span>
        ) : (
          <button
            type="button"
            className="history-today"
            data-testid="history-today"
            onClick={() => setPicked(null)}
          >
            今日へ
          </button>
        )}
      </div>
      <div className="history-summary">
        <p className="history-total" data-testid="history-total">
          <b>{formatTotal(totalSec(dayRecords))}</b>
          <span>{dayRecords.length}回</span>
        </p>
        {/* 0 時から 24 時の帯に、集中した時間帯を置く。一覧と同じ内容なので読み上げには出さない。 */}
        <div className="history-ribbon" aria-hidden="true">
          {dayRecords.map((record) => {
            const left = (Date.parse(record.started_at) - dayStart) / DAY_MS;
            const width = Math.min(
              (record.actual_sec * 1000) / DAY_MS,
              1 - left,
            );
            return (
              <i
                key={record.id}
                data-hue={hueOf(record.category, categories, colors)}
                style={{ left: `${left * 100}%`, width: `${width * 100}%` }}
              />
            );
          })}
        </div>
      </div>
      <div className="history-hours" aria-hidden="true">
        <span>0</span>
        <span>6</span>
        <span>12</span>
        <span>18</span>
        <span>24</span>
      </div>
      {shownError && (
        <p role="alert" className="alert box" data-testid="history-error">
          {shownError}
        </p>
      )}
      {dayRecords.length === 0 ? (
        <p className="history-empty" data-testid="history-empty">
          {records ? "この日の記録はありません" : !error && "読み込み中…"}
        </p>
      ) : (
        <ul className="history-list" data-testid="history-list">
          {dayRecords.map((record) => (
            <li
              key={record.id}
              className="history-item"
              data-testid="history-item"
              data-hue={hueOf(record.category, categories, colors)}
              data-outcome={record.outcome}
            >
              <p
                className="history-item-title"
                data-testid="history-item-title"
                data-empty={record.title ? undefined : ""}
              >
                {record.title || "（タイトルなし）"}
              </p>
              <span
                className="history-item-length"
                data-testid="history-item-length"
              >
                {formatMinutes(record.actual_sec)}
              </span>
              <div className="history-item-details">
                <p
                  className="history-item-time"
                  data-testid="history-item-time"
                >
                  {formatClock(Date.parse(record.started_at))} –{" "}
                  {formatClock(Date.parse(record.ended_at))}
                  {record.outcome === "ended_early" && (
                    <span data-testid="history-item-early">途中で終了</span>
                  )}
                </p>
                {record.category && (
                  <span
                    className="history-item-category"
                    data-testid="history-item-category"
                    data-hue={hueOf(record.category, categories, colors)}
                  >
                    {record.category}
                  </span>
                )}
                <button
                  type="button"
                  className="icon-button"
                  data-testid="history-edit"
                  aria-label={`${record.title || "タイトルなしの記録"} を編集`}
                  onClick={() =>
                    setForm({ base: record, initial: toInput(record) })
                  }
                >
                  <Icon>
                    <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                  </Icon>
                </button>
                <button
                  type="button"
                  className="icon-button"
                  data-testid="history-delete"
                  aria-label={`${record.title || "タイトルなしの記録"} を削除`}
                  onClick={() => setDeleting(record)}
                >
                  <Icon>
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </Icon>
                </button>
              </div>
              {record.notes && (
                <p
                  className="history-item-notes"
                  data-testid="history-item-notes"
                >
                  {record.notes}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}
