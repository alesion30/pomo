import { LONG_EVERY } from "../domain/constants";
import type { AppState, Command } from "../domain/timer";
import { view } from "../domain/timer";
import { Clock } from "../ui/Clock";
import { CycleDots } from "../ui/CycleDots";
import { type Colors, hueOf } from "../ui/categoryColor";

export function FocusEnd({
  state,
  now,
  dispatch,
  categories,
  colors,
}: {
  state: AppState;
  now: number;
  dispatch: (command: Command) => void;
  categories: string[];
  colors: Colors;
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
    <main
      className={`screen focus-due${running ? "" : " solo"}`}
      data-testid="front-screen"
      data-screen="focus-end"
      data-tone="focus-due"
    >
      {running ? (
        <>
          <div className="topbar due-topbar">
            <CycleDots
              done={Math.min(state.streak.completed + 1, LONG_EVERY)}
            />
          </div>
          <div className="due-head">
            <h1 className="due-title">集中終了</h1>
            <Clock testId="front-clock" time={view(state.timer, now)} />
            <div className="clock-caption">超過</div>
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
                onClick={() => dispatch({ type: "adjust", deltaSec: 300 })}
              >
                +5分
              </button>
            </div>
          </div>
          {(state.draft.title || state.draft.category) && (
            <div
              className="session"
              data-hue={hueOf(state.draft.category || null, categories, colors)}
            >
              {state.draft.title && (
                <p className="session-title">{state.draft.title}</p>
              )}
              {state.draft.category && (
                <p className="session-category">{state.draft.category}</p>
              )}
            </div>
          )}
          <label className="field-label" htmlFor="front-notes">
            振り返り
          </label>
          <textarea
            id="front-notes"
            className="notes tall"
            data-testid="front-notes"
            aria-label="振り返り"
            placeholder="できたこと、気づいたこと、次にやること"
            value={state.draft.notes}
            onChange={(e) =>
              dispatch({ type: "editDraft", notes: e.target.value })
            }
          />
          {actions}
        </>
      ) : (
        <>
          <div className="topbar due-topbar">
            <CycleDots done={state.streak.completed} />
          </div>
          <div className="solo-content">
            <svg className="dial-check" viewBox="0 0 48 48" aria-hidden="true">
              <circle cx="24" cy="24" r="22.5" />
              <path d="M14 25l7 7 14-16" />
            </svg>
            <h1 className="due-title">集中終了</h1>
          </div>
          {actions}
        </>
      )}
    </main>
  );
}
