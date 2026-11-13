import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef } from "react";
import { view } from "./domain/timer";
import { BreakEnd } from "./front/BreakEnd";
import { FocusEnd } from "./front/FocusEnd";
import { Popover } from "./popover/Popover";
import { QuitConfirm } from "./QuitConfirm";
import { useTimer } from "./useTimer";

export function Main() {
  const timer = useTimer();
  const state = timer.appState;
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
  return (
    <>
      {dueScreen === "focus" ? (
        <FocusEnd state={state} now={timer.now} dispatch={timer.dispatch} />
      ) : dueScreen === "break" ? (
        <BreakEnd state={state} now={timer.now} dispatch={timer.dispatch} />
      ) : (
        <Popover {...timer} />
      )}
      <QuitConfirm />
    </>
  );
}
