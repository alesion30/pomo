import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef, useState } from "react";
import { DiscardConfirm } from "../DiscardConfirm";
import { type AppState, type Command, view } from "../domain/timer";
import { filterCategories } from "./categories";
import { UpdateButton } from "./UpdateButton";
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
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
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
  // 取得は非同期で並ぶので、後から届いた古い結果で上書きしない。
  const request = useRef(0);
  const refreshCategories = useCallback(() => {
    const id = ++request.current;
    void invoke<string[]>("recent_categories")
      .then((list) => {
        if (id === request.current) setCategories(list);
      })
      .catch(console.error);
  }, []);
  useEffect(() => {
    refreshCategories();
    const refresh = () => {
      if (document.visibilityState === "visible") refreshCategories();
    };
    window.addEventListener("focus", refresh);
    // 記録はどちらのウィンドウからも追記されるので、Rust からの通知で候補を取り直す。
    const unlisten = listen("records-changed", refreshCategories);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      void unlisten.then((off) => off());
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [refreshCategories]);
  const refreshUpdate = useCallback(() => {
    void invoke<string | null>("update_status")
      .then(setUpdateVersion)
      .catch(console.error);
  }, []);
  const applyUpdate = useCallback(() => {
    setUpdateError(null);
    setApplying(true);
    void invoke<void>("apply_update").catch((error: unknown) => {
      setApplying(false);
      setUpdateError(String(error));
    });
  }, []);
  useEffect(() => {
    refreshUpdate();
    const refresh = () => {
      if (document.visibilityState === "visible") refreshUpdate();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    const unlisten = listen<string>("update-available", (event) =>
      setUpdateVersion(event.payload),
    );
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      void unlisten.then((off) => off());
    };
  }, [refreshUpdate]);
  const edit = (field: "title" | "category" | "notes", value: string) =>
    dispatch({ type: "editDraft", [field]: value });
  const suggestions = filterCategories(categories, appState.draft.category);
  return (
    <main className="popover">
      {confirmDiscard && (
        <DiscardConfirm
          onConfirm={() => {
            setConfirmDiscard(false);
            dispatch({ type: "discardFocus" });
          }}
          onCancel={() => setConfirmDiscard(false)}
        />
      )}
      <div data-testid="phase" className="phase">
        {phase}
      </div>
      <div data-testid="clock" className="clock">
        {timer.phase === "idle" ? "--:--" : clock}
      </div>
      <UpdateButton
        version={updateVersion}
        phase={timer.phase}
        applying={applying}
        onApply={applyUpdate}
      />
      {updateError && <p role="alert">更新に失敗しました: {updateError}</p>}
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
        {timer.phase === "focus" && (
          <>
            <button
              type="button"
              data-testid="break-now"
              onClick={() => dispatch({ type: "startBreak" })}
            >
              休憩
            </button>
            <button
              type="button"
              data-testid="discard"
              onClick={() => setConfirmDiscard(true)}
            >
              破棄
            </button>
          </>
        )}
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
