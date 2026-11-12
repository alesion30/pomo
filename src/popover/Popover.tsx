import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";
import { type AppState, type Command, view } from "../domain/timer";
import { filterCategories } from "./categories";
import "./popover.css";

export function Popover({
  appState,
  now,
  dispatch,
}: {
  appState: AppState;
  now: number;
  dispatch: (command: Command) => void;
}) {
  const [categories, setCategories] = useState<string[]>([]);
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
  const seconds = time.overtimeSec || time.remainingSec;
  const clock = `${time.overtimeSec ? "+" : ""}${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const refreshCategories = useCallback(
    () =>
      void invoke<string[]>("recent_categories")
        .then(setCategories)
        .catch(console.error),
    [],
  );
  useEffect(() => {
    refreshCategories();
    const refresh = () => {
      if (document.visibilityState === "visible") refreshCategories();
    };
    const updated = (event: Event) =>
      setCategories((event as CustomEvent<string[]>).detail);
    window.addEventListener("focus", refresh);
    window.addEventListener("recent-categories-updated", updated);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("recent-categories-updated", updated);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [refreshCategories]);
  const edit = (field: "title" | "category" | "notes", value: string) =>
    dispatch({ type: "editDraft", [field]: value });
  const suggestions = filterCategories(categories, appState.draft.category);
  return (
    <main className="popover">
      <div data-testid="phase" className="phase">
        {phase}
      </div>
      <div data-testid="clock" className="clock">
        {timer.phase === "idle" ? "--:--" : clock}
      </div>
      <label>
        タイトル
        <input
          data-testid="title-input"
          value={appState.draft.title}
          onChange={(e) => edit("title", e.target.value)}
          placeholder="タイトル"
        />
      </label>
      <label>
        カテゴリ
        <input
          data-testid="category-input"
          value={appState.draft.category}
          onChange={(e) => edit("category", e.target.value)}
          placeholder="カテゴリ"
        />
      </label>
      {suggestions.map((category) => (
        <button
          className="suggestion"
          data-testid="category-suggestion"
          key={category}
          type="button"
          onClick={() => edit("category", category)}
        >
          {category}
        </button>
      ))}
      <label>
        振り返り
        <textarea
          data-testid="notes-input"
          value={appState.draft.notes}
          onChange={(e) => edit("notes", e.target.value)}
          placeholder="振り返り"
        />
      </label>
      <div className="controls">
        <button
          type="button"
          data-testid="start"
          className="primary"
          onClick={() => dispatch({ type: "startFocus" })}
        >
          開始
        </button>
        <button
          type="button"
          data-testid="end"
          onClick={() => {
            dispatch({
              type: timer.phase === "break" ? "endBreak" : "endFocus",
            });
            refreshCategories();
          }}
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
              className="primary"
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
      </div>
    </main>
  );
}
