import type { AppState, Command } from "../domain/timer";
import { view } from "../domain/timer";

export function FocusEnd({
  state,
  now,
  dispatch,
}: {
  state: AppState;
  now: number;
  dispatch: (command: Command) => void;
}) {
  const time = view(state.timer, now);
  const secs = time.overtimeSec || time.remainingSec;
  const clock = `${time.overtimeSec ? "+" : ""}${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
  return (
    <section data-testid="front-screen" data-screen="focus-end">
      <h1>集中終了</h1>
      {state.timer.phase === "focus" && (
        <>
          <div data-testid="front-clock">{clock}</div>
          <textarea
            data-testid="front-notes"
            value={state.draft.notes}
            onChange={(e) =>
              dispatch({ type: "editDraft", notes: e.target.value })
            }
          />
          <button
            type="button"
            data-testid="front-plus5"
            onClick={() => {
              dispatch({ type: "adjust", deltaSec: 300 });
            }}
          >
            +5分
          </button>
          <button
            type="button"
            data-testid="front-minus5"
            onClick={() => dispatch({ type: "adjust", deltaSec: -300 })}
          >
            -5分
          </button>
        </>
      )}
      <button
        type="button"
        data-testid="front-start-break"
        onClick={() => {
          if (state.timer.phase === "focus") dispatch({ type: "endFocus" });
          dispatch({ type: "startBreak" });
        }}
      >
        休憩開始
      </button>
      <button
        type="button"
        data-testid="front-skip"
        onClick={() => {
          if (state.timer.phase === "focus") dispatch({ type: "endFocus" });
          dispatch({ type: "skipBreak" });
        }}
      >
        スキップ
      </button>
    </section>
  );
}
