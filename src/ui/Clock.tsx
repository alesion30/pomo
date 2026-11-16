export function Clock({
  time,
  testId,
}: {
  time: { remainingSec: number; overtimeSec: number } | null;
  testId?: string;
}) {
  const seconds = time ? time.overtimeSec || time.remainingSec : 0;
  const text = time
    ? `${time.overtimeSec ? "+" : ""}${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`
    : "--:--";
  return (
    <div className="clock" data-testid={testId}>
      {text}
    </div>
  );
}
