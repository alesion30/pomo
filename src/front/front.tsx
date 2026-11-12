import { invoke } from "@tauri-apps/api/core";
import type { AppState, Command } from "../domain/timer";
import { BreakEnd } from "./BreakEnd";
import { FocusEnd } from "./FocusEnd";

export function Front({
  state,
  now,
  dispatch,
}: {
  state: AppState;
  now: number;
  dispatch: (command: Command) => void;
}) {
  const hide = () => {
    void invoke("hide_front");
  };
  return state.timer.phase === "focus" ? (
    <FocusEnd state={state} now={now} dispatch={dispatch} onHide={hide} />
  ) : (
    <BreakEnd state={state} now={now} dispatch={dispatch} onHide={hide} />
  );
}
