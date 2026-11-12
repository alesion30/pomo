import type { AppState, Command } from "../domain/timer";

export function BreakEnd({
  state,
  dispatch,
  onHide,
}: {
  state: AppState;
  now: number;
  dispatch: (command: Command) => void;
  onHide: () => void;
}) {
  const start = () => {
    if (state.timer.phase === "break") dispatch({ type: "endBreak" });
    dispatch({ type: "startFocus" });
    onHide();
  };
  return (
    <section
      data-testid="front-screen"
      data-screen={state.timer.phase === "break" ? "break-end" : "next-focus"}
    >
      <h1>{state.timer.phase === "break" ? "休憩終了" : "次の集中"}</h1>
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
