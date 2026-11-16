export function ConfirmDialog({
  name,
  message,
  detail,
  okLabel,
  tone = "danger",
  onConfirm,
  onCancel,
}: {
  name: string;
  message: string;
  detail: string;
  okLabel: string;
  tone?: "danger" | "plain";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="scrim">
      <section
        className="dialog"
        data-testid={`${name}-confirm`}
        role="dialog"
        aria-modal="true"
      >
        <p>{message}</p>
        <small>{detail}</small>
        <div className="dialog-actions">
          <button
            type="button"
            className="button"
            data-testid={`${name}-cancel`}
            onClick={onCancel}
          >
            キャンセル
          </button>
          <button
            type="button"
            className={`button ${tone === "danger" ? "danger" : "primary"}`}
            data-testid={`${name}-confirm-ok`}
            onClick={onConfirm}
          >
            {okLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
