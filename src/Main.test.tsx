// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type AppState, initialState } from "./domain/timer";

const mock = vi.hoisted(() => ({
  state: null as AppState | null,
  now: 0,
  invoke: vi.fn((..._args: unknown[]) => Promise.resolve(null)),
}));
vi.mock("./useTimer", () => ({
  useTimer: () => ({
    appState: mock.state ?? initialState,
    now: mock.now,
    dispatch: vi.fn(),
  }),
}));
vi.mock("@tauri-apps/api/core", () => ({ invoke: mock.invoke }));
vi.mock("@tauri-apps/api/event", () => ({
  listen: () => Promise.resolve(() => {}),
}));

import { Main } from "./MainWindow";

describe("Main screen", () => {
  afterEach(() => {
    cleanup();
    mock.invoke.mockClear();
  });
  it("shows the regular view while idle, offered break, and active phases", () => {
    mock.now = 1_000;
    mock.state = initialState;
    const { rerender } = render(<Main />);
    expect(screen.getByTestId("phase")).toBeTruthy();
    mock.state = {
      ...initialState,
      timer: { phase: "idle", offer: "short_break" },
    };
    rerender(<Main />);
    expect(screen.getByTestId("front-screen").getAttribute("data-screen")).toBe(
      "focus-end",
    );
    mock.now = 100_000;
    mock.state = {
      ...initialState,
      timer: { phase: "focus", startedAt: 0, plannedSec: 25 },
    };
    mock.now = 1_000;
    rerender(<Main />);
    expect(screen.getByTestId("phase").textContent).toBe("集中");
    mock.now = 100_000;
    rerender(<Main />);
    expect(screen.getByTestId("front-screen").getAttribute("data-screen")).toBe(
      "focus-end",
    );
    mock.state = {
      ...initialState,
      timer: {
        phase: "break",
        kind: "short_break",
        startedAt: 0,
        plannedSec: 25,
      },
    };
    mock.now = 1_000;
    rerender(<Main />);
    expect(screen.getByTestId("phase").textContent).toBe("短い休憩");
    mock.now = 100_000;
    rerender(<Main />);
    expect(screen.getByTestId("front-screen").getAttribute("data-screen")).toBe(
      "break-end",
    );
  });
  it("ends due presentation once on leaving its screen", () => {
    mock.now = 100_000;
    mock.state = {
      ...initialState,
      timer: { phase: "focus", startedAt: 0, plannedSec: 25 },
    };
    const { rerender } = render(<Main />);
    mock.state = initialState;
    rerender(<Main />);
    rerender(<Main />);
    expect(
      mock.invoke.mock.calls.filter(([command]) => command === "end_due"),
    ).toHaveLength(1);
    expect(mock.invoke).toHaveBeenCalledWith("end_due");
  });
});
