import type { AppState, Command } from "../domain/timer";
import { view } from "../domain/timer";
import { Clock } from "../ui/Clock";
import { Dial } from "../ui/Dial";

export function FocusEnd({
  state,
  now,
  dispatch,
}: {
  state: AppState;
  now: number;
  dispatch: (command: Command) => void;
}) {
  const running = state.timer.phase === "focus";
  const actions = (
    <div className="actions">
      <button
        type="button"
        data-testid="front-skip"
        className="button"
        onClick={() => {
          if (state.timer.phase === "focus") dispatch({ type: "endFocus" });
          dispatch({ type: "skipBreak" });
        }}
      >
        スキップ
      </button>
      <button
        type="button"
        data-testid="front-start-break"
        className="button primary"
        onClick={() => {
          if (state.timer.phase === "focus") dispatch({ type: "endFocus" });
          dispatch({ type: "startBreak" });
        }}
      >
        休憩開始
      </button>
    </div>
  );
  return (
    <section
      className={running ? "screen" : "screen solo"}
      data-testid="front-screen"
      data-screen="focus-end"
      data-tone="focus-due"
    >
      <div className="pane-time">
        <h1 className="phase">集中終了</h1>
        <Dial remaining={1}>
          {running ? (
            <>
              <Clock testId="front-clock" time={view(state.timer, now)} />
              <div className="clock-caption">超過</div>
            </>
          ) : (
            <svg className="dial-check" viewBox="0 0 48 48" aria-hidden="true">
              <path d="M12 25l8.5 8.5L36 16" />
            </svg>
          )}
        </Dial>
        {running ? (
          <div className="adjust">
            <button
              type="button"
              data-testid="front-minus5"
              onClick={() => dispatch({ type: "adjust", deltaSec: -300 })}
            >
              −5分
            </button>
            <button
              type="button"
              data-testid="front-plus5"
              onClick={() => {
                dispatch({ type: "adjust", deltaSec: 300 });
              }}
            >
              +5分
            </button>
          </div>
        ) : (
          actions
        )}
      </div>
      {running && (
        <div className="pane-note">
          <div className="card">
            {state.draft.title && (
              <p className="session-title">{state.draft.title}</p>
            )}
            {state.draft.category && (
              <p className="session-category">{state.draft.category}</p>
            )}
            <textarea
              className="notes"
              data-testid="front-notes"
              aria-label="振り返り"
              placeholder="振り返り"
              value={state.draft.notes}
              onChange={(e) =>
                dispatch({ type: "editDraft", notes: e.target.value })
              }
            />
            {actions}
          </div>
        </div>
      )}
    </section>
  );
}
