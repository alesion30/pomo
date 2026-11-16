import { useEffect } from "react";

const copy = {
  break: { heading: "休憩に入る", okLabel: "休憩する" },
  end: { heading: "集中を終了", okLabel: "終了する" },
};

/** 集中を休憩か終了で閉じる前に、振り返りを書く画面。 */
export function WrapUpSheet({
  name,
  title,
  category,
  notes,
  early,
  onNotes,
  onConfirm,
  onCancel,
}: {
  name: keyof typeof copy;
  title: string;
  category: string;
  notes: string;
  early: boolean;
  onNotes(value: string): void;
  onConfirm(): void;
  onCancel(): void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.isComposing) return;
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter" && e.metaKey) onConfirm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, onConfirm]);
  const { heading, okLabel } = copy[name];
  return (
    <div className="scrim">
      <form
        className="dialog wrapup"
        data-testid={`${name}-confirm`}
        role="dialog"
        aria-modal="true"
        aria-label={heading}
        onSubmit={(e) => {
          e.preventDefault();
          onConfirm();
        }}
      >
        <p className="dialog-title">{heading}</p>
        {(title || category) && (
          <div className="wrapup-session" data-testid="wrapup-session">
            {title && <span className="wrapup-title">{title}</span>}
            {category && <span className="wrapup-category">{category}</span>}
          </div>
        )}
        <label className="wrapup-label" htmlFor="wrapup-notes">
          振り返り
        </label>
        <textarea
          id="wrapup-notes"
          className="record-field wrapup-notes"
          data-testid="wrapup-notes"
          placeholder="できたこと、気づいたこと、次にやること"
          // biome-ignore lint/a11y/noAutofocus: 振り返りを書くために開く画面なので、すぐ書き始められるようにする
          autoFocus
          value={notes}
          onChange={(e) => onNotes(e.target.value)}
        />
        {early && (
          <small data-testid="wrapup-early">
            予定時間の前なので、この集中は回数に数えません。
          </small>
        )}
        <div className="dialog-actions wrapup-foot">
          <span className="wrapup-hint" aria-hidden="true">
            ⌘↩ で確定
          </span>
          <button
            type="button"
            className="button"
            data-testid={`${name}-cancel`}
            onClick={onCancel}
          >
            キャンセル
          </button>
          <button
            type="submit"
            className="button primary"
            data-testid={`${name}-confirm-ok`}
          >
            {okLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
