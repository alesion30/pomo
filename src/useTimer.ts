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
  const scaleRef = useRef(1);
  scaleRef.current = scale;
  const revision = useRef(0);
  const pending = useRef(0);
  const queue = useRef<Promise<void>>(Promise.resolve());
  // 読み込み中の操作は deferred に積み、画面にだけ先に反映する。読み込みがすべて終わったら、
  // 正本に対して順に流し直す。先に保存すると古い版を元にした保存として拒否され、操作が消える。
  const deferred = useRef<Command[]>([]);
  const runRef = useRef<(command: Command) => void>(() => {});
  // 保存の応答待ちの間は取り込まず false を返す。その間に積んだ操作は、列が空になった後の読み込みで流し直す。
  const accept = useCallback((saved: Persisted) => {
    if (pending.current > 0) return false;
    if (saved.revision < revision.current) return true;
    revision.current = saved.revision;
    if (!saved.app) return true;
    latest.current = saved.app;
    // 未保存の操作は正本の上に重ねて見せ、打った文字が画面から消えないようにする。
    let shown = saved.app;
    for (const command of deferred.current)
      shown = transition(shown, command, Date.now(), scaleRef.current).state;
    setAppStateRaw(shown);
    return true;
  }, []);
  const syncing = useRef<Promise<void> | null>(null);
  const refresh: () => Promise<void> = useCallback(() => {
    const loading: Promise<void> = invoke<Persisted>("load_state")
      .then(accept, (error) => {
        console.error(error);
        // 正本を読めないまま流し直すと古い版で保存して拒否されるので、少し待って読み直す。
        if (deferred.current.length > 0) setTimeout(() => void refresh(), 500);
        return false;
      })
      .then((accepted) => {
        if (syncing.current !== loading) return;
        syncing.current = null;
        if (!accepted) return;
        const commands = deferred.current;
        deferred.current = [];
        for (const command of commands) runRef.current(command);
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
          if (result.record)
            await invoke("append_record", { record: result.record });
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
      // 積んだ操作が残っている間は、新しい操作もその後ろに積んで順序を保つ。
      if (!syncing.current && deferred.current.length === 0)
        return run(command);
      deferred.current.push(command);
      setAppStateRaw(
        (shown) => transition(shown, command, Date.now(), scale).state,
      );
    },
    [run, scale],
  );
  runRef.current = run;
  return { appState, now, dispatch };
}
