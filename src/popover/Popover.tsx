import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "../ConfirmDialog";
import { type AppState, type Command, view } from "../domain/timer";
import { Clock } from "../ui/Clock";
import { Dial } from "../ui/Dial";
import { TitleField } from "../ui/TitleField";
import { filterCategories } from "./categories";
import { UpdateButton } from "./UpdateButton";

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
  const [confirming, setConfirming] = useState<keyof typeof confirms | null>(
    null,
  );
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
  // 予定時間前の休憩と終了は、この集中を回数に数えないので確かめる。
  const early = timer.phase === "focus" && time.remainingSec > 0;
  const confirmIfEarly = (name: "break" | "end") =>
    early ? setConfirming(name) : dispatch(confirms[name].command);
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
    <main className="screen" data-tone={timer.phase}>
      {confirming && (
        <ConfirmDialog
          name={confirming}
          {...confirms[confirming]}
          onConfirm={() => {
            setConfirming(null);
            dispatch(confirms[confirming].command);
          }}
          onCancel={() => setConfirming(null)}
        />
      )}
      <div className="pane-time">
        <div data-testid="phase" className="phase">
          {phase}
        </div>
        <Dial
          remaining={
            timer.phase === "idle" ? 0 : time.remainingSec / timer.plannedSec
          }
        >
          <Clock testId="clock" time={timer.phase === "idle" ? null : time} />
          {timer.phase !== "idle" && (
            <div className="clock-caption">
              {time.overtimeSec ? "超過" : "残り"}
            </div>
          )}
        </Dial>
        <div className="adjust">
          {timer.phase !== "idle" && (
            <>
              <button
                type="button"
                data-testid="minus5"
                onClick={() => dispatch({ type: "adjust", deltaSec: -300 })}
              >
                −5分
              </button>
              <button
                type="button"
                data-testid="plus5"
                onClick={() => dispatch({ type: "adjust", deltaSec: 300 })}
              >
                +5分
              </button>
            </>
          )}
        </div>
      </div>
      <div className="pane-note">
        <div className="card">
          {timer.phase === "break" && <p className="card-label">次の集中</p>}
          <TitleField
            testId="title-input"
            value={appState.draft.title}
            onChange={(value) => edit("title", value)}
          />
          <div className="category-row">
            <input
              className="category-field"
              data-testid="category-input"
              aria-label="カテゴリ"
              value={appState.draft.category}
              onChange={(e) => edit("category", e.target.value)}
              placeholder="カテゴリ"
            />
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
          </div>
          {timer.phase !== "break" && (
            <textarea
              className="notes"
              data-testid="notes-input"
              aria-label="振り返り"
              value={appState.draft.notes}
              onChange={(e) => edit("notes", e.target.value)}
              placeholder="振り返り"
            />
          )}
          <div className="actions">
            {timer.phase === "idle" && (
              <button
                type="button"
                data-testid="start"
                className="button primary"
                onClick={() => dispatch({ type: "startFocus" })}
              >
                開始
              </button>
            )}
            {timer.phase === "idle" && timer.offer && (
              <>
                <button
                  type="button"
                  data-testid="start-break"
                  className="button"
                  onClick={() => dispatch({ type: "startBreak" })}
                >
                  休憩開始
                </button>
                <button
                  type="button"
                  data-testid="skip-break"
                  className="button"
                  onClick={() => dispatch({ type: "skipBreak" })}
                >
                  スキップ
                </button>
              </>
            )}
            {timer.phase === "focus" && (
              <button
                type="button"
                data-testid="break-now"
                className="button wide"
                onClick={() => confirmIfEarly("break")}
              >
                休憩
              </button>
            )}
            {timer.phase === "focus" && (
              <button
                type="button"
                data-testid="end"
                className="button wide"
                onClick={() => confirmIfEarly("end")}
              >
                終了
              </button>
            )}
            {timer.phase === "break" && (
              <>
                <button
                  type="button"
                  data-testid="start-focus"
                  className="button primary"
                  onClick={() => dispatch({ type: "startFocus" })}
                >
                  集中を開始
                </button>
                <button
                  type="button"
                  data-testid="discard-break"
                  className="button ghost"
                  onClick={() => setConfirming("discard-break")}
                >
                  休憩を破棄
                </button>
              </>
            )}
            {timer.phase === "focus" && (
              <button
                type="button"
                data-testid="discard"
                className="button ghost"
                onClick={() => setConfirming("discard")}
              >
                破棄
              </button>
            )}
          </div>
        </div>
        <UpdateButton
          version={updateVersion}
          phase={timer.phase}
          applying={applying}
          onApply={applyUpdate}
        />
        {updateError && (
          <p role="alert" className="alert">
            更新に失敗しました: {updateError}
          </p>
        )}
      </div>
    </main>
  );
}

const confirms = {
  discard: {
    message: "集中を破棄しますか？",
    detail: "この集中は記録に残りません。",
    okLabel: "破棄する",
    command: { type: "discardFocus" },
  },
  "discard-break": {
    message: "休憩を破棄しますか？",
    detail: "この休憩は記録に残りません。",
    okLabel: "破棄する",
    command: { type: "discardBreak" },
  },
  break: {
    message: "休憩に入りますか？",
    detail: "予定時間の前なので、この集中は回数に数えません。",
    okLabel: "休憩する",
    command: { type: "startBreak" },
  },
  end: {
    message: "集中を終了しますか？",
    detail: "予定時間の前なので、この集中は回数に数えません。",
    okLabel: "終了する",
    command: { type: "endFocus" },
  },
} satisfies Record<
  string,
  { message: string; detail: string; okLabel: string; command: Command }
>;
