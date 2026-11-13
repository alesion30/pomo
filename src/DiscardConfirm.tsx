export function DiscardConfirm({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="scrim">
      <section
        className="dialog"
        data-testid="discard-confirm"
        role="dialog"
        aria-modal="true"
      >
        <p>集中を破棄しますか？</p>
        <small>この集中は記録に残りません。</small>
        <div className="dialog-actions">
          <button
            type="button"
            className="button"
            data-testid="discard-cancel"
            onClick={onCancel}
          >
            キャンセル
          </button>
          <button
            type="button"
            className="button danger"
            data-testid="discard-confirm-ok"
            onClick={onConfirm}
          >
            破棄する
          </button>
        </div>
      </section>
    </div>
  );
}
