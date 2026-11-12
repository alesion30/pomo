import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type AppState,
  type Command,
  initialState,
  transition,
} from "./domain/timer";

type Schedule = {
  label: string;
  kind: "focus" | "short_break" | "long_break";
  started_at: number;
  planned_end: number;
};
type Persisted = {
  app: AppState | null;
  schedule: Schedule | null;
  revision: number;
};

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

export function useTimer() {
  const [appState, setAppStateRaw] = useState<AppState>(initialState);
  const latest = useRef<AppState>(initialState);
  const setAppState = useCallback((state: AppState) => {
    latest.current = state;
    setAppStateRaw(state);
  }, []);
  const [now, setNow] = useState(Date.now());
  const [scale, setScale] = useState(1);
  const revision = useRef(0);
  const pending = useRef(0);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const accept = useCallback(
    (saved: Persisted) => {
      if (pending.current > 0 || saved.revision < revision.current) return;
      revision.current = saved.revision;
      if (saved.app) setAppState(saved.app);
    },
    [setAppState],
  );
  // 読み込み中の操作は、読み込みが終わってから最新の状態に対して計算する。
  // 先に計算すると、古い版を元にした保存として拒否され、操作が消える。
  const syncing = useRef<Promise<void> | null>(null);
  const refresh = useCallback(() => {
    const loading: Promise<void> = invoke<Persisted>("load_state")
      .then(accept)
      .finally(() => {
        if (syncing.current === loading) syncing.current = null;
      });
    syncing.current = loading;
    return loading;
  }, [accept]);
  useEffect(() => {
    void invoke<number>("time_scale").then(setScale);
    void refresh();
    const unlisten = listen<Persisted>("state-changed", (event) =>
      accept(event.payload),
    );
    // 隠れている間は JS が止まるので、表示し直した時点の時刻で表示を作り直す。
    const focus = () => {
      if (document.visibilityState !== "visible") return;
      setNow(Date.now());
      void refresh();
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
  }, [refresh, accept]);
  const run = useCallback(
    (command: Command) => {
      const result = transition(latest.current, command, Date.now(), scale);
      setAppState(result.state);
      pending.current++;
      queue.current = queue.current
        .then(async () => {
          // 状態の保存が通った操作だけを記録に残す。保存が版の食い違いで拒否された操作は、正本を読み直して捨てる。
          const saved = await invoke<number>("save_state", {
            state: result.state,
            schedule: makeSchedule(result.state),
            baseRevision: revision.current,
          });
          revision.current = saved;
          if (result.record) {
            await invoke("append_record", { record: result.record });
            const categories = await invoke<string[]>("recent_categories");
            window.dispatchEvent(
              new CustomEvent("recent-categories-updated", {
                detail: categories,
              }),
            );
          }
        })
        .catch((error) => console.error(error))
        .finally(() => {
          pending.current--;
          if (pending.current === 0) void refresh();
        });
    },
    [refresh, scale, setAppState],
  );
  const dispatch = useCallback(
    (command: Command) => {
      const loading = syncing.current;
      if (!loading) return run(command);
      void loading.catch(() => {}).then(() => run(command));
    },
    [run],
  );
  return { appState, now, dispatch };
}
