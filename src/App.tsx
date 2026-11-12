import { view } from "./domain/timer";
import { useTimer } from "./useTimer";

function App() {
  const { appState, now, dispatch } = useTimer();
  const timer = appState.timer;
  const phase =
    timer.phase === "idle"
      ? "待機中"
      : timer.phase === "focus"
        ? "集中"
        : timer.kind === "short_break"
          ? "短い休憩"
          : "長い休憩";
  const time = view(timer, now);
  const secs = time.overtimeSec || time.remainingSec;
  const clock = `${time.overtimeSec ? "+" : ""}${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
  return (
    <main>
      <div data-testid="phase">{phase}</div>
      <div data-testid="clock">{timer.phase === "idle" ? "--:--" : clock}</div>
      <input
        data-testid="title-input"
        value={appState.draft.title}
        onChange={(e) => dispatch({ type: "editDraft", title: e.target.value })}
        placeholder="タイトル"
      />
      <button
        type="button"
        data-testid="start"
        onClick={() => dispatch({ type: "startFocus" })}
      >
        開始
      </button>
      <button
        type="button"
        data-testid="end"
        onClick={() =>
          dispatch({
            type: timer.phase === "break" ? "endBreak" : "endFocus",
          })
        }
        disabled={timer.phase === "idle"}
      >
        終了
      </button>
      <button
        type="button"
        data-testid="plus5"
        onClick={() => dispatch({ type: "adjust", deltaSec: 300 })}
        disabled={timer.phase === "idle"}
      >
        +5分
      </button>
      <button
        type="button"
        data-testid="minus5"
        onClick={() => dispatch({ type: "adjust", deltaSec: -300 })}
        disabled={timer.phase === "idle"}
      >
        -5分
      </button>
      {timer.phase === "idle" && timer.offer && (
        <>
          <button
            type="button"
            data-testid="start-break"
            onClick={() => dispatch({ type: "startBreak" })}
          >
            休憩開始
          </button>
          <button
            type="button"
            data-testid="skip-break"
            onClick={() => dispatch({ type: "skipBreak" })}
          >
            スキップ
          </button>
        </>
      )}
    </main>
  );
}

export default App;
