import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { view } from "./domain/timer";
import { Front } from "./front/front";
import { useTimer } from "./useTimer";

function FrontRoot() {
  const { appState, now, dispatch } = useTimer();
  // 予定時間前の集中や休憩に変わったら閉じる。ポップオーバーから新しいフェーズを始めた時に、古い終了画面を残さない。
  useEffect(() => {
    const timer = appState.timer;
    if (timer.phase !== "idle" && view(timer, Date.now()).remainingSec > 0)
      void invoke("hide_front");
  }, [appState]);
  return <Front state={appState} now={now} dispatch={dispatch} />;
}
const Root = getCurrentWindow().label === "front" ? FrontRoot : App;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
