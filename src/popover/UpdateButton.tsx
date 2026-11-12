export function UpdateButton({
  version,
  phase,
  onApply,
}: {
  version: string | null;
  phase: "idle" | "focus" | "break";
  onApply(): void;
}) {
  if (version === null) return null;
  return (
    <div>
      <button
        type="button"
        data-testid="update-button"
        disabled={phase !== "idle"}
        onClick={onApply}
      >
        更新あり (v{version})
      </button>
      {phase !== "idle" && <small>待機中に適用できます</small>}
    </div>
  );
}
