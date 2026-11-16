import { useState } from "react";
import { ConfirmDialog } from "../ConfirmDialog";
import type { AppState, Command } from "../domain/timer";
import { view } from "../domain/timer";
import { CategorySelect } from "../ui/CategorySelect";
import { Clock } from "../ui/Clock";
import { CycleDots } from "../ui/CycleDots";
import { type Colors, hueOf } from "../ui/categoryColor";
import { TitleField } from "../ui/TitleField";

export function BreakEnd({
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
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  return (
    <section
      className="screen break-due"
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
      <div className="topbar due-topbar">
        <CycleDots done={state.streak.completed} />
      </div>
      <div className="due-head break-due-head">
        <h1 className="due-title">休憩終了</h1>
        <Clock time={view(state.timer, now)} />
        <div className="clock-caption">超過</div>
      </div>
      <div className="break-due-intent">
        <p className="intent-label">次の集中</p>
        <TitleField
          testId="front-title"
          placeholder="次は何に集中しますか？"
          value={state.draft.title}
          onChange={(title) => dispatch({ type: "editDraft", title })}
        />
        <div data-hue={hueOf(state.draft.category || null, categories, colors)}>
          <CategorySelect
            testId="front-category"
            categories={categories}
            hue={hueOf(state.draft.category || null, categories, colors)}
            value={state.draft.category}
            onChange={(category) => dispatch({ type: "editDraft", category })}
          />
        </div>
      </div>
      <div className="actions break-due-actions">
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
    </section>
  );
}
