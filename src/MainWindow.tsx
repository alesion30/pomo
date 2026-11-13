import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef, useState } from "react";
import { view } from "./domain/timer";
import { BreakEnd } from "./front/BreakEnd";
import { FocusEnd } from "./front/FocusEnd";
import { Popover } from "./popover/Popover";
import { QuitConfirm } from "./QuitConfirm";
import { Settings } from "./settings/Settings";
import { useConfig } from "./useConfig";
import { useTimer } from "./useTimer";

export function Main() {
  const timer = useTimer();
  const { config, saveCategories } = useConfig();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const state = timer.appState;
  const categories = config?.categories ?? [];
  const due =
    (state.timer.phase === "focus" || state.timer.phase === "break") &&
    view(state.timer, timer.now).remainingSec === 0;
  const offeredFocusEnd =
    state.timer.phase === "idle" && state.timer.offer !== undefined;
  const dueScreen =
    (state.timer.phase === "focus" && due) || offeredFocusEnd
      ? "focus"
      : state.timer.phase === "break" && due
        ? "break"
        : null;
  const previousDue = useRef(false);
  useEffect(() => {
    if (previousDue.current && dueScreen === null) void invoke("end_due");
    previousDue.current = dueScreen !== null;
  }, [dueScreen]);
  useEffect(() => {
    const unlisten = listen("open-settings", () => setSettingsOpen(true));
    return () => void unlisten.then((off) => off());
  }, []);
  // 一覧にないカテゴリは、進行中の集中に付いていれば残し、入力欄に残っているだけなら「なし」に戻す。
  const { phase } = state.timer;
  const { category } = state.draft;
  const { dispatch } = timer;
  useEffect(() => {
    if (
      config &&
      phase !== "focus" &&
      category &&
      !config.categories.includes(category)
    )
      dispatch({ type: "editDraft", category: "" });
  }, [config, phase, category, dispatch]);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  return (
    <>
      {dueScreen === "focus" ? (
        <FocusEnd state={state} now={timer.now} dispatch={timer.dispatch} />
      ) : dueScreen === "break" ? (
        <BreakEnd
          state={state}
          now={timer.now}
          dispatch={timer.dispatch}
          categories={categories}
        />
      ) : settingsOpen ? (
        <Settings
          config={config}
          phase={state.timer.phase}
          saveCategories={saveCategories}
          onClose={closeSettings}
        />
      ) : (
        <Popover
          {...timer}
          categories={categories}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}
      <QuitConfirm />
    </>
  );
}
