import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type AppState,
  type Command,
  initialState,
  transition,
  view,
} from "./domain/timer";

type Schedule = {
  label: string;
  kind: "focus" | "short_break" | "long_break";
  started_at: number;
  planned_end: number;
};

type Persisted = { app: AppState; schedule: Schedule | null };
function makeSchedule(state: AppState): Schedule | null {
  const timer = state.timer;
  if (timer.phase === "idle") return null;
  return {
    label: timer.phase === "focus" ? state.draft.title : "",
    kind: timer.phase === "focus" ? "focus" : timer.kind,
    started_at: timer.startedAt,
    planned_end: timer.startedAt + timer.plannedSec * 1000,
  };
}

function App() {
  const [appState, setAppStateRaw] = useState<AppState>(initialState);
  // 連続した入力でも直前の遷移結果から次を計算するため、最新の状態を ref にも持つ。
  const latest = useRef<AppState>(initialState);
  const setAppState = useCallback((state: AppState) => {
    latest.current = state;
    setAppStateRaw(state);
  }, []);
  const [now, setNow] = useState(Date.now());
  const [scale, setScale] = useState(1);
  const refresh = useCallback(async () => {
    const saved = await invoke<Persisted>("load_state");
    if (saved.app) setAppState(saved.app);
  }, [setAppState]);
  useEffect(() => {
    void invoke<number>("time_scale").then(setScale);
    void refresh();
    const unlisten = listen<AppState>("state-changed", (event) =>
      setAppState(event.payload),
    );
    const focus = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", focus);
      void unlisten.then((off) => off());
    };
  }, [refresh, setAppState]);
  const dispatch = async (command: Command) => {
    const result = transition(latest.current, command, Date.now(), scale);
    setAppState(result.state);
    if (result.record) await invoke("append_record", { record: result.record });
    await invoke("save_state", {
      state: result.state,
      schedule: makeSchedule(result.state),
    });
  };
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
  const secs = time.overtimeSec || time.remainingSec;
  const clock = `${time.overtimeSec ? "+" : ""}${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
  return (
    <main>
      <div data-testid="phase">{phase}</div>
      <div data-testid="clock">{timer.phase === "idle" ? "--:--" : clock}</div>
      <input
        data-testid="title-input"
        value={appState.draft.title}
        onChange={(e) =>
          void dispatch({ type: "editDraft", title: e.target.value })
        }
        placeholder="タイトル"
      />
      <button
        type="button"
        data-testid="start"
        onClick={() => void dispatch({ type: "startFocus" })}
      >
        開始
      </button>
      <button
        type="button"
        data-testid="end"
        onClick={() =>
          void dispatch({
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
        onClick={() => void dispatch({ type: "adjust", deltaSec: 300 })}
        disabled={timer.phase === "idle"}
      >
        +5分
      </button>
      <button
        type="button"
        data-testid="minus5"
        onClick={() => void dispatch({ type: "adjust", deltaSec: -300 })}
        disabled={timer.phase === "idle"}
      >
        -5分
      </button>
      {timer.phase === "idle" && timer.offer && (
        <>
          <button
            type="button"
            data-testid="start-break"
            onClick={() => void dispatch({ type: "startBreak" })}
          >
            休憩開始
          </button>
          <button
            type="button"
            data-testid="skip-break"
            onClick={() => void dispatch({ type: "skipBreak" })}
          >
            スキップ
          </button>
        </>
      )}
    </main>
  );
}

export default App;
