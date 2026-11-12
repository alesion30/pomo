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
    // 超過や 100 分以上で桁が増えてもリングの内側に収まるよう、桁数を CSS に渡して字を小さくする。
    <div
      className="clock"
      data-testid={testId}
      data-length={Math.min(text.length, 7)}
    >
      {text}
    </div>
  );
}
