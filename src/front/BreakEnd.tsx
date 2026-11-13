import { useState } from "react";
import { ConfirmDialog } from "../ConfirmDialog";
import type { AppState, Command } from "../domain/timer";
import { view } from "../domain/timer";
import { CategorySelect } from "../ui/CategorySelect";
import { Clock } from "../ui/Clock";
import { Dial } from "../ui/Dial";
import { TitleField } from "../ui/TitleField";

export function BreakEnd({
  state,
  now,
  dispatch,
  categories,
}: {
  state: AppState;
  now: number;
  dispatch: (command: Command) => void;
  categories: string[];
}) {
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  return (
    <section
      className="screen"
      data-testid="front-screen"
      data-screen="break-end"
      data-tone="break-due"
    >
      {confirmDiscard && (
        <ConfirmDialog
          name="discard-break"
          message="休憩を破棄しますか？"
          detail="この休憩は記録に残りません。"
          okLabel="破棄する"
          onConfirm={() => {
            setConfirmDiscard(false);
            dispatch({ type: "discardBreak" });
          }}
          onCancel={() => setConfirmDiscard(false)}
        />
      )}
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
            <CategorySelect
              testId="front-category"
              categories={categories}
              value={state.draft.category}
              onChange={(category) => dispatch({ type: "editDraft", category })}
            />
          </div>
          <div className="actions">
            <button
              type="button"
              data-testid="front-start"
              className="button primary"
              onClick={() => dispatch({ type: "startFocus" })}
            >
              集中を開始
            </button>
            <button
              type="button"
              data-testid="front-discard-break"
              className="button ghost"
              onClick={() => setConfirmDiscard(true)}
            >
              休憩を破棄
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
