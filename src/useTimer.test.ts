// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type AppState, initialState } from "./domain/timer";

type Persisted = { app: AppState | null; schedule: null; revision: number };
const ipc = vi.hoisted(() => ({
  loads: [] as ((p: unknown) => void)[],
  saves: [] as { title: string; base: number }[],
  revision: 7,
  hold: false,
  held: null as null | (() => void),
  listener: null as null | ((e: { payload: unknown }) => void),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (command: string, args: Record<string, unknown>) => {
    if (command === "time_scale") return Promise.resolve(1);
    if (command === "load_state")
      return new Promise((resolve) => ipc.loads.push(resolve));
    if (command === "save_state") {
      const base = args.baseRevision as number;
      if (base !== ipc.revision) return Promise.reject(new Error("conflict"));
      ipc.revision += 1;
      ipc.saves.push({ title: (args.state as AppState).draft.title, base });
      const saved = ipc.revision;
      if (!ipc.hold) return Promise.resolve(saved);
      return new Promise((resolve) => {
        ipc.held = () => resolve(saved);
      });
    }
    return Promise.resolve(null);
  },
}));
vi.mock("@tauri-apps/api/event", () => ({
  listen: (_: string, cb: (e: { payload: unknown }) => void) => {
    ipc.listener = cb;
    return Promise.resolve(() => {});
  },
}));

const { useTimer } = await import("./useTimer");
const persisted = (title: string, revision: number): Persisted => ({
  app: { ...initialState, draft: { ...initialState.draft, title } },
  schedule: null,
  revision,
});
const flush = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });

describe("useTimer while a load is in flight", () => {
  beforeEach(() => {
    ipc.loads = [];
    ipc.saves = [];
    ipc.revision = 7;
    ipc.hold = false;
    ipc.held = null;
  });
  afterEach(cleanup);

  it("shows typed text at once and saves it against the loaded revision", async () => {
    const { result } = renderHook(() => useTimer());
    act(() => result.current.dispatch({ type: "editDraft", title: "a" }));
    act(() => result.current.dispatch({ type: "editDraft", title: "ab" }));
    expect(result.current.appState.draft.title).toBe("ab");
    await act(async () => ipc.loads[0](persisted("", 7)));
    await flush();
    expect(ipc.saves.map((s) => s.title)).toEqual(["a", "ab"]);
    expect(ipc.saves[0].base).toBe(7);
    expect(result.current.appState.draft.title).toBe("ab");
  });

  it("keeps deferred typing visible when another window's state arrives", async () => {
    const { result } = renderHook(() => useTimer());
    act(() => result.current.dispatch({ type: "editDraft", title: "a" }));
    act(() => ipc.listener?.({ payload: persisted("", 7) }));
    expect(result.current.appState.draft.title).toBe("a");
    act(() => result.current.dispatch({ type: "editDraft", title: "ab" }));
    await act(async () => ipc.loads[0](persisted("", 7)));
    await flush();
    expect(ipc.saves.map((s) => s.title)).toEqual(["a", "ab"]);
  });

  it("waits for the newest load before replaying", async () => {
    const { result } = renderHook(() => useTimer());
    act(() => result.current.dispatch({ type: "editDraft", title: "a" }));
    act(() => window.dispatchEvent(new Event("focus")));
    act(() => result.current.dispatch({ type: "editDraft", title: "ab" }));
    await act(async () => ipc.loads[0](persisted("", 6)));
    await flush();
    expect(ipc.saves).toEqual([]);
    await act(async () => ipc.loads[1](persisted("", 7)));
    await flush();
    expect(ipc.saves.map((s) => s.title)).toEqual(["a", "ab"]);
  });

  it("does not replay against a load it ignored while its own save was pending", async () => {
    const { result } = renderHook(() => useTimer());
    await act(async () => ipc.loads[0](persisted("", 7)));
    await flush();
    ipc.hold = true;
    act(() => result.current.dispatch({ type: "editDraft", title: "x" }));
    await flush();
    ipc.hold = false;
    ipc.revision = 9;
    act(() => window.dispatchEvent(new Event("focus")));
    act(() => result.current.dispatch({ type: "editDraft", title: "xa" }));
    act(() => result.current.dispatch({ type: "editDraft", title: "xab" }));
    await act(async () => ipc.loads[1](persisted("other", 9)));
    await flush();
    expect(ipc.saves.map((s) => s.title)).toEqual(["x"]);
    await act(async () => ipc.held?.());
    await flush();
    await act(async () => ipc.loads[2](persisted("other", 9)));
    await flush();
    expect(ipc.saves.map((s) => s.title)).toEqual(["x", "xa", "xab"]);
    expect(ipc.saves[1].base).toBe(9);
    expect(result.current.appState.draft.title).toBe("xab");
  });
});
