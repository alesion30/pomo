// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppState, Command } from "../domain/timer";
import { FocusEnd } from "./FocusEnd";

const state: AppState = {
  timer: { phase: "focus", startedAt: 0, plannedSec: 1500 },
  streak: { completed: 0, lastPhaseEndedAt: null },
  draft: { title: "", category: "", notes: "" },
};

describe("FocusEnd", () => {
  afterEach(() => document.body.replaceChildren());
  it("dispatches endFocus then startBreak", () => {
    const dispatch = vi.fn<(command: Command) => void>();
    render(
      <FocusEnd
        state={state}
        now={1_500_000}
        dispatch={dispatch}
        onHide={() => {}}
      />,
    );
    fireEvent.click(screen.getByTestId("front-start-break"));
    expect(dispatch.mock.calls).toEqual([
      [{ type: "endFocus" }],
      [{ type: "startBreak" }],
    ]);
  });
  it("dispatches endFocus then skipBreak", () => {
    const dispatch = vi.fn<(command: Command) => void>();
    render(
      <FocusEnd
        state={state}
        now={1_500_000}
        dispatch={dispatch}
        onHide={() => {}}
      />,
    );
    fireEvent.click(screen.getByTestId("front-skip"));
    expect(dispatch.mock.calls).toEqual([
      [{ type: "endFocus" }],
      [{ type: "skipBreak" }],
    ]);
  });
  it("extends and edits notes through Commands", () => {
    const dispatch = vi.fn<(command: Command) => void>();
    render(
      <FocusEnd
        state={state}
        now={1_500_000}
        dispatch={dispatch}
        onHide={() => {}}
      />,
    );
    fireEvent.click(screen.getByTestId("front-plus5"));
    fireEvent.change(screen.getByTestId("front-notes"), {
      target: { value: "review" },
    });
    expect(dispatch.mock.calls).toEqual([
      [{ type: "adjust", deltaSec: 300 }],
      [{ type: "editDraft", notes: "review" }],
    ]);
  });
  it("starts the offered break without ending a focus again", () => {
    const dispatch = vi.fn<(command: Command) => void>();
    render(
      <FocusEnd
        state={{ ...state, timer: { phase: "idle", offer: "short_break" } }}
        now={1_500_000}
        dispatch={dispatch}
        onHide={() => {}}
      />,
    );
    expect(screen.queryByTestId("front-plus5")).toBeNull();
    fireEvent.click(screen.getByTestId("front-start-break"));
    expect(dispatch.mock.calls).toEqual([[{ type: "startBreak" }]]);
  });
});
