export function UpdateButton({
  version,
  phase,
  applying = false,
  onApply,
}: {
  version: string | null;
  phase: "idle" | "focus" | "break";
  applying?: boolean;
  onApply(): void;
}) {
  if (version === null) return null;
  return (
    <div className="update">
      <button
        type="button"
        data-testid="update-button"
        disabled={phase !== "idle" || applying}
        onClick={onApply}
      >
        {applying ? "更新中…" : `更新あり (v${version})`}
      </button>
      {phase !== "idle" && <small>待機中に適用できます</small>}
    </div>
  );
}
