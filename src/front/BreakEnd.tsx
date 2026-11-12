import type { AppState, Command } from "../domain/timer";
import { view } from "../domain/timer";
import { Clock } from "../ui/Clock";
import { Dial } from "../ui/Dial";
import { TitleField } from "../ui/TitleField";

export function BreakEnd({
  state,
  now,
  dispatch,
}: {
  state: AppState;
  now: number;
  dispatch: (command: Command) => void;
}) {
  const start = () => {
    if (state.timer.phase === "break") dispatch({ type: "endBreak" });
    dispatch({ type: "startFocus" });
  };
  return (
    <section
      className="screen"
      data-testid="front-screen"
      data-screen="break-end"
      data-tone="break-due"
    >
      <div className="pane-time">
        <h1 className="phase">休憩終了</h1>
        <Dial remaining={1}>
          <Clock time={view(state.timer, now)} />
          <div className="clock-caption">超過</div>
        </Dial>
        <div className="adjust" />
      </div>
      <div className="pane-note">
        <div className="card compact">
          <p className="card-label">次の集中</p>
          <TitleField
            testId="front-title"
            value={state.draft.title}
            onChange={(title) => dispatch({ type: "editDraft", title })}
          />
          <div className="category-row">
            <input
              className="category-field"
              data-testid="front-category"
              aria-label="カテゴリ"
              value={state.draft.category}
              placeholder="カテゴリ"
              onChange={(e) =>
                dispatch({ type: "editDraft", category: e.target.value })
              }
            />
          </div>
          <div className="actions">
            <button
              type="button"
              data-testid="front-start"
              className="button primary"
              onClick={start}
            >
              開始
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
