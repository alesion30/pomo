import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "../ConfirmDialog";
import { type AppState, type Command, view } from "../domain/timer";
import { CategorySelect } from "../ui/CategorySelect";
import { Clock } from "../ui/Clock";
import { Dial } from "../ui/Dial";
import { TitleField } from "../ui/TitleField";
import { UpdateButton } from "./UpdateButton";

export function Popover({
  appState,
  now,
  dispatch,
  categories,
  onOpenSettings,
}: {
  appState: AppState;
  now: number;
  dispatch: (command: Command) => void;
  categories: string[];
  onOpenSettings(): void;
}) {
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
        <div className="pane-head">
          <div data-testid="phase" className="phase">
            {phase}
          </div>
          <button
            type="button"
            className="icon-button"
            data-testid="open-settings"
            aria-label="設定"
            title="設定（⌘,）"
            onClick={onOpenSettings}
          >
            <GearIcon />
          </button>
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
            <CategorySelect
              testId="category-input"
              categories={categories}
              value={appState.draft.category}
              onChange={(value) => edit("category", value)}
            />
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

function GearIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
