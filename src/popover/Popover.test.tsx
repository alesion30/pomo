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

describe("Popover focus actions", () => {
  afterEach(() => {
    cleanup();
    mock.invoke.mockClear();
  });
  const focusState = {
    ...structuredClone(initialState),
    timer: { phase: "focus" as const, startedAt: 0, plannedSec: 1500 },
  };
  it("confirms break and end before the planned time; cancel dispatches nothing", () => {
    const dispatch = vi.fn();
    render(<Popover appState={focusState} now={0} dispatch={dispatch} />);
    fireEvent.click(screen.getByTestId("break-now"));
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
  it("breaks and ends without confirmation after the planned time", () => {
    const dispatch = vi.fn();
    render(
      <Popover appState={focusState} now={1_500_000} dispatch={dispatch} />,
    );
    fireEvent.click(screen.getByTestId("break-now"));
    expect(dispatch).toHaveBeenLastCalledWith({ type: "startBreak" });
    fireEvent.click(screen.getByTestId("end"));
    expect(dispatch).toHaveBeenLastCalledWith({ type: "endFocus" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("confirms discard; cancel dispatches nothing", () => {
    const dispatch = vi.fn();
    render(<Popover appState={focusState} now={0} dispatch={dispatch} />);
    fireEvent.click(screen.getByTestId("discard"));
    fireEvent.click(screen.getByTestId("discard-cancel"));
    expect(dispatch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("discard"));
    fireEvent.click(screen.getByTestId("discard-confirm-ok"));
    expect(dispatch).toHaveBeenLastCalledWith({ type: "discardFocus" });
  });
});
