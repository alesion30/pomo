export function DiscardConfirm({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <section data-testid="discard-confirm" role="dialog" aria-modal="true">
      <p>集中を破棄しますか？</p>
      <button
        type="button"
        data-testid="discard-confirm-ok"
        onClick={onConfirm}
      >
        破棄する
      </button>
      <button type="button" data-testid="discard-cancel" onClick={onCancel}>
        キャンセル
      </button>
    </section>
  );
}
