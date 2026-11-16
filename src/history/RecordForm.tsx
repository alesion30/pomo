import { useState } from "react";
import { formatClock } from "../popover/clockTime";
import { CategorySelect } from "../ui/CategorySelect";
import { formatMinutes, resolveTimes } from "./dayClock";
import { type RecordInput, startOfDay, validate } from "./records";

/** 記録の追加と編集の入力。Esc は、重なりの一番上だけを閉じるよう履歴画面の側で受ける。 */
export function RecordForm({
  heading,
  dayLabel,
  initial,
  now,
  categories,
  onSave,
  onCancel,
}: {
  heading: string;
  dayLabel: string;
  initial: RecordInput;
  now: number;
  categories: string[];
  onSave(input: RecordInput): Promise<void>;
  onCancel(): void;
}) {
  const [title, setTitle] = useState(initial.title);
  const [category, setCategory] = useState(initial.category);
  const [notes, setNotes] = useState(initial.notes);
  const [start, setStart] = useState(formatClock(initial.startedAt));
  const [end, setEnd] = useState(formatClock(initial.endedAt));
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const input = {
    title,
    category,
    notes,
    ...resolveTimes(start, end, initial),
  };
  const invalid = validate(input, now);
  const error = invalid ?? failure;
  const nextDay =
    Number.isFinite(input.endedAt) &&
    startOfDay(new Date(input.endedAt)).getTime() !==
      startOfDay(new Date(input.startedAt)).getTime();
  return (
    <div className="scrim">
      <form
        className="dialog record-edit"
        data-testid="record-edit"
        role="dialog"
        aria-modal="true"
        aria-label={heading}
        onSubmit={(e) => {
          e.preventDefault();
          if (invalid || saving) return;
          setSaving(true);
          setFailure(null);
          onSave(input).catch((reason: unknown) => {
            setSaving(false);
            setFailure(`保存に失敗しました: ${String(reason)}`);
          });
        }}
      >
        <div className="record-edit-head">
          <p>{heading}</p>
          <span>{dayLabel}</span>
        </div>
        <input
          className="record-field"
          data-testid="record-title"
          aria-label="タイトル"
          placeholder="タイトル"
          // biome-ignore lint/a11y/noAutofocus: 開いてすぐ打ち始められるよう、重ねた入力の最初の欄に置く。
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="record-edit-row">
          <input
            type="time"
            className="record-field"
            data-testid="record-start"
            aria-label="開始"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
          <span className="record-edit-dash">–</span>
          <input
            type="time"
            className="record-field"
            data-testid="record-end"
            aria-label="終了"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
          <span className="record-edit-length" data-testid="record-length">
            {nextDay && <b>翌日</b>}
            {!invalid &&
              formatMinutes((input.endedAt - input.startedAt) / 1000)}
          </span>
          <CategorySelect
            testId="record-category"
            categories={categories}
            value={category}
            onChange={setCategory}
          />
        </div>
        <textarea
          className="record-field record-notes"
          data-testid="record-notes"
          aria-label="振り返り"
          placeholder="振り返り"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="record-edit-foot">
          {error && (
            <small role="alert" className="alert" data-testid="record-error">
              {error}
            </small>
          )}
          <button
            type="button"
            className="button"
            data-testid="record-cancel"
            onClick={onCancel}
          >
            キャンセル
          </button>
          <button
            type="submit"
            className="button primary"
            data-testid="record-save"
            disabled={invalid !== null || saving}
          >
            保存
          </button>
        </div>
      </form>
    </div>
  );
}
