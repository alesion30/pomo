import { getCurrentWindow } from "@tauri-apps/api/window";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { Front } from "./front/front";
import { useTimer } from "./useTimer";

function FrontRoot() {
  const { appState, now, dispatch } = useTimer();
  return <Front state={appState} now={now} dispatch={dispatch} />;
}
const Root = getCurrentWindow().label === "front" ? FrontRoot : App;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
