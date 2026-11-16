// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  invoke: vi.fn(() => Promise.resolve([])),
  listen: vi.fn(() => Promise.resolve(() => {})),
}));
vi.mock("@tauri-apps/api/core", () => ({ invoke: mock.invoke }));
vi.mock("@tauri-apps/api/event", () => ({ listen: mock.listen }));

import { initialState } from "../domain/timer";
import { Popover } from "./Popover";

const extra = {
  categories: [],
  onOpenSettings: () => {},
  onOpenHistory: () => {},
  scale: 1,
};

describe("Popover focus actions", () => {
  afterEach(() => {
    cleanup();
    mock.invoke.mockClear();
  });
  const focusState = {
    ...structuredClone(initialState),
    timer: { phase: "focus" as const, startedAt: 0, plannedSec: 1500 },
  };
  it("shows no notes field on the timer screen while idle or focusing", () => {
    const { rerender } = render(
      <Popover
        appState={structuredClone(initialState)}
        now={0}
        dispatch={() => {}}
        {...extra}
      />,
    );
    expect(screen.queryByRole("textbox", { name: "振り返り" })).toBeNull();
    rerender(
      <Popover appState={focusState} now={0} dispatch={() => {}} {...extra} />,
    );
    expect(screen.queryByRole("textbox", { name: "振り返り" })).toBeNull();
  });
  it("asks for notes on break and end before the planned time; cancel dispatches nothing", () => {
    const dispatch = vi.fn();
    render(
      <Popover appState={focusState} now={0} dispatch={dispatch} {...extra} />,
    );
    fireEvent.click(screen.getByTestId("break-now"));
    expect(screen.getByTestId("break-confirm").textContent).toContain(
      "回数に数えません",
    );
    expect(document.activeElement).toBe(screen.getByTestId("wrapup-notes"));
    expect(screen.getByTestId("break-confirm-ok").className).toContain(
      "primary",
    );
    fireEvent.click(screen.getByTestId("break-cancel"));
    fireEvent.click(screen.getByTestId("end"));
    fireEvent.click(screen.getByTestId("end-cancel"));
    expect(dispatch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("break-now"));
    fireEvent.click(screen.getByTestId("break-confirm-ok"));
    expect(dispatch).toHaveBeenLastCalledWith({ type: "startBreak" });
    fireEvent.click(screen.getByTestId("end"));
    fireEvent.click(screen.getByTestId("end-confirm-ok"));
    expect(dispatch).toHaveBeenLastCalledWith({ type: "endFocus" });
  });
  it("asks for notes after the planned time too, without the early note", () => {
    const dispatch = vi.fn();
    render(
      <Popover
        appState={focusState}
        now={1_500_000}
        dispatch={dispatch}
        {...extra}
      />,
    );
    fireEvent.click(screen.getByTestId("break-now"));
    expect(screen.getByTestId("break-confirm").textContent).not.toContain(
      "回数に数えません",
    );
    expect(dispatch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("break-confirm-ok"));
    expect(dispatch).toHaveBeenLastCalledWith({ type: "startBreak" });
    fireEvent.click(screen.getByTestId("end"));
    fireEvent.click(screen.getByTestId("end-confirm-ok"));
    expect(dispatch).toHaveBeenLastCalledWith({ type: "endFocus" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("writes notes into the draft and shows the focus being closed", () => {
    const dispatch = vi.fn();
    const state = {
      ...focusState,
      draft: { title: "設計メモ", category: "設計", notes: "前半は順調" },
    };
    render(<Popover appState={state} now={0} dispatch={dispatch} {...extra} />);
    fireEvent.click(screen.getByTestId("end"));
    expect(screen.getByTestId("wrapup-session").textContent).toBe(
      "設計メモ設計",
    );
    expect(screen.getByTestId("wrapup-notes")).toHaveProperty(
      "value",
      "前半は順調",
    );
    fireEvent.change(screen.getByTestId("wrapup-notes"), {
      target: { value: "方針を決めた" },
    });
    expect(dispatch).toHaveBeenLastCalledWith({
      type: "editDraft",
      notes: "方針を決めた",
    });
  });
  it("confirms with ⌘Enter and cancels with Escape", () => {
    const dispatch = vi.fn();
    render(
      <Popover appState={focusState} now={0} dispatch={dispatch} {...extra} />,
    );
    fireEvent.click(screen.getByTestId("end"));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("end-confirm")).toBeNull();
    expect(dispatch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("end"));
    fireEvent.keyDown(window, { key: "Enter" });
    expect(dispatch).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: "Enter", metaKey: true });
    expect(dispatch).toHaveBeenLastCalledWith({ type: "endFocus" });
    expect(screen.queryByTestId("end-confirm")).toBeNull();
  });
  it("confirms discard; cancel dispatches nothing", () => {
    const dispatch = vi.fn();
    render(
      <Popover appState={focusState} now={0} dispatch={dispatch} {...extra} />,
    );
    fireEvent.click(screen.getByTestId("discard"));
    fireEvent.click(screen.getByTestId("discard-cancel"));
    expect(dispatch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("discard"));
    fireEvent.click(screen.getByTestId("discard-confirm-ok"));
    expect(dispatch).toHaveBeenLastCalledWith({ type: "discardFocus" });
  });
  it("offers start-focus and confirmed discard during a break, without notes", () => {
    const dispatch = vi.fn();
    const breakState = {
      ...structuredClone(initialState),
      timer: {
        phase: "break" as const,
        kind: "short_break" as const,
        startedAt: 0,
        plannedSec: 300,
      },
    };
    render(
      <Popover appState={breakState} now={0} dispatch={dispatch} {...extra} />,
    );
    expect(screen.queryByRole("textbox", { name: "振り返り" })).toBeNull();
    expect(screen.queryByTestId("end")).toBeNull();
    fireEvent.click(screen.getByTestId("discard-break"));
    fireEvent.click(screen.getByTestId("discard-break-cancel"));
    expect(dispatch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("discard-break"));
    fireEvent.click(screen.getByTestId("discard-break-confirm-ok"));
    expect(dispatch).toHaveBeenLastCalledWith({ type: "discardBreak" });
    fireEvent.click(screen.getByTestId("start-focus"));
    expect(dispatch).toHaveBeenLastCalledWith({ type: "startFocus" });
  });
});

describe("Popover idle display", () => {
  afterEach(cleanup);
  it("shows the planned focus time and an unclickable time preview", () => {
    render(
      <Popover
        appState={structuredClone(initialState)}
        now={new Date(2026, 10, 16, 10, 47).getTime()}
        dispatch={() => {}}
        {...extra}
      />,
    );
    expect(screen.getByTestId("clock").textContent).toBe("25:00");
    expect(screen.queryByTestId("time-range")).toBeNull();
    expect(screen.getByText(/→/).tagName).toBe("SPAN");
  });
});

describe("Popover time range", () => {
  afterEach(cleanup);
  const startedAt = new Date(2026, 10, 16, 10, 47, 31).getTime();
  const now = startedAt + 5 * 60_000;
  const state = {
    ...structuredClone(initialState),
    timer: { phase: "focus" as const, startedAt, plannedSec: 1500 },
  };
  it("shows the start and planned end and edits them", () => {
    const dispatch = vi.fn();
    render(
      <Popover appState={state} now={now} dispatch={dispatch} {...extra} />,
    );
    expect(screen.getByTestId("time-range").textContent).toBe("10:47 → 11:12");
    fireEvent.click(screen.getByTestId("time-range"));
    expect(screen.getByTestId("time-end").textContent).toBe("11:12");
    expect(screen.getByTestId("time-hours")).toHaveProperty("value", "0");
    expect(screen.getByTestId("time-minutes")).toHaveProperty("value", "25");
    fireEvent.change(screen.getByTestId("time-start"), {
      target: { value: "10:40" },
    });
    fireEvent.change(screen.getByTestId("time-hours"), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByTestId("time-save"));
    expect(dispatch).toHaveBeenCalledWith({
      type: "editTimes",
      startedAt: new Date(2026, 10, 16, 10, 40).getTime(),
      plannedMin: 85,
    });
    expect(screen.queryByTestId("time-edit")).toBeNull();
  });
  it("refuses a future start or a zero duration, and cancel dispatches nothing", () => {
    const dispatch = vi.fn();
    render(
      <Popover appState={state} now={now} dispatch={dispatch} {...extra} />,
    );
    fireEvent.click(screen.getByTestId("time-range"));
    fireEvent.change(screen.getByTestId("time-start"), {
      target: { value: "11:00" },
    });
    expect(screen.getByTestId("time-error").textContent).toContain("今より前");
    expect(screen.getByTestId("time-save")).toHaveProperty("disabled", true);
    fireEvent.change(screen.getByTestId("time-start"), {
      target: { value: "10:47" },
    });
    fireEvent.change(screen.getByTestId("time-minutes"), {
      target: { value: "0" },
    });
    expect(screen.getByTestId("time-error").textContent).toContain("1 分以上");
    fireEvent.click(screen.getByTestId("time-cancel"));
    expect(dispatch).not.toHaveBeenCalled();
    expect(screen.queryByTestId("time-edit")).toBeNull();
  });
});
