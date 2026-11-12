import type { AppState, Command } from "../domain/timer";

export function BreakEnd({
  state,
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
    <section data-testid="front-screen" data-screen="break-end">
      <h1>休憩終了</h1>
      <input
        data-testid="front-title"
        value={state.draft.title}
        placeholder="タイトル"
        onChange={(e) => dispatch({ type: "editDraft", title: e.target.value })}
      />
      <input
        data-testid="front-category"
        value={state.draft.category}
        placeholder="カテゴリ"
        onChange={(e) =>
          dispatch({ type: "editDraft", category: e.target.value })
        }
      />
      <button type="button" data-testid="front-start" onClick={start}>
        開始
      </button>
    </section>
  );
}
