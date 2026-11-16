import { describe, expect, it } from "vitest";
import { type AppState, initialState } from "../domain/timer";
import { cycleProgress } from "./CycleDots";

const state = (
  completed: number,
  timer: AppState["timer"],
  lastPhaseEndedAt: number | null,
): AppState => ({
  ...initialState,
  timer,
  streak: { completed, lastPhaseEndedAt },
});

describe("cycle progress", () => {
  it("shows completed sessions and the current focus, capped at four", () => {
    const focus = { phase: "focus" as const, startedAt: 0, plannedSec: 1500 };
    expect(cycleProgress(state(2, focus, null), 0, 1)).toEqual({
      done: 2,
      current: 2,
    });
    expect(cycleProgress(state(4, focus, null), 0, 1)).toEqual({
      done: 4,
      current: -1,
    });
  });

  it("clears the idle display after the streak gap", () => {
    expect(
      cycleProgress(state(3, initialState.timer, 0), 3_600_000, 1),
    ).toEqual({
      done: 0,
      current: -1,
    });
    expect(
      cycleProgress(state(3, initialState.timer, 0), 3_599_999, 1).done,
    ).toBe(3);
  });
});
