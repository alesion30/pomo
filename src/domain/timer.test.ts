import { describe, expect, it } from "vitest";
import {
  type AppState,
  initialState,
  plannedMinutes,
  transition,
  view,
} from "./timer";

describe("timer transitions", () => {
  it("offers a long break after four completed focus sessions", () => {
    let app = structuredClone(initialState);
    for (let i = 0; i < 4; i++) {
      app = transition(app, { type: "startFocus" }, i * 1_800_000).state;
      app = transition(
        app,
        { type: "endFocus" },
        i * 1_800_000 + 1_500_000,
      ).state;
      if (i < 3)
        app = transition(
          app,
          { type: "skipBreak" },
          i * 1_800_000 + 1_501_000,
        ).state;
    }
    expect(app.timer).toEqual({ phase: "idle", offer: "long_break" });
  });
  it("does not count early endings and resets after a long gap", () => {
    const focus = transition(initialState, { type: "startFocus" }, 0, 60).state;
    const early = transition(focus, { type: "endFocus" }, 1000, 60).state;
    expect(early.streak.completed).toBe(0);
    const app = { ...early, streak: { completed: 3, lastPhaseEndedAt: 1_000 } };
    expect(
      transition(app, { type: "startFocus" }, 3_601_000).state.streak.completed,
    ).toBe(0);
  });
  it("shows overtime after reducing planned duration below elapsed and floors duration", () => {
    let app = transition(initialState, { type: "startFocus" }, 0, 60).state;
    app = transition(app, { type: "adjust", deltaSec: -300 }, 0, 60).state;
    expect(app.timer).toMatchObject({ phase: "focus", plannedSec: 20 });
    expect(view(app.timer, 21_000).overtimeSec).toBe(1);
    app = transition(app, { type: "adjust", deltaSec: -300 }, 0, 60).state;
    app = transition(app, { type: "adjust", deltaSec: -300 }, 0, 60).state;
    app = transition(app, { type: "adjust", deltaSec: -300 }, 0, 60).state;
    app = transition(app, { type: "adjust", deltaSec: -300 }, 0, 60).state;
    expect(app.timer).toMatchObject({ phase: "focus", plannedSec: 5 });
  });
  it("jumps to overtime when less than the adjust step remains and counts as completed", () => {
    let app = transition(initialState, { type: "startFocus" }, 0, 60).state;
    app = transition(app, { type: "adjust", deltaSec: -300 }, 22_400, 60).state;
    expect(app.timer).toMatchObject({ phase: "focus", plannedSec: 22 });
    expect(view(app.timer, 22_400)).toEqual({
      remainingSec: 0,
      overtimeSec: 0,
    });
    const ended = transition(app, { type: "endFocus" }, 23_000, 60);
    expect(ended.record).toMatchObject({ outcome: "completed" });
    expect(ended.state.streak.completed).toBe(1);
  });
  it("jumps a break to overtime when less than the adjust step remains", () => {
    const app: AppState = {
      ...structuredClone(initialState),
      timer: {
        phase: "break",
        kind: "short_break",
        startedAt: 0,
        plannedSec: 5,
      },
    };
    const next = transition(app, { type: "adjust", deltaSec: -300 }, 2_000, 60);
    expect(next.state.timer).toMatchObject({ plannedSec: 2 });
  });
});

describe("draft and time scale", () => {
  it("starts the offered short break after an early break-now", () => {
    const app = transition(initialState, { type: "startFocus" }, 0, 60).state;
    const result = transition(app, { type: "startBreak" }, 1_000, 60);
    expect(result.record).toMatchObject({
      outcome: "ended_early",
      kind: "focus",
    });
    expect(result.state.timer).toMatchObject({
      phase: "break",
      kind: "short_break",
    });
    expect(result.state.streak.completed).toBe(0);
  });
  it("starts a break after completed break-now and chooses long on the fourth", () => {
    let app: AppState = {
      ...initialState,
      streak: { completed: 3, lastPhaseEndedAt: null },
    };
    app = transition(app, { type: "startFocus" }, 0, 60).state;
    const result = transition(app, { type: "startBreak" }, 300_000, 60);
    expect(result.record).toMatchObject({ outcome: "completed" });
    expect(result.state.streak.completed).toBe(4);
    expect(result.state.timer).toMatchObject({
      phase: "break",
      kind: "long_break",
    });
  });
  it("discards focus without recording or changing streak, and retains title/category", () => {
    let app = transition(
      initialState,
      { type: "editDraft", title: "Task", category: "Work", notes: "note" },
      0,
    ).state;
    app = transition(app, { type: "startFocus" }, 10_000).state;
    app.streak = { completed: 2, lastPhaseEndedAt: 9_000 };
    const result = transition(app, { type: "discardFocus" }, 11_000);
    expect(result.record).toBeNull();
    expect(result.state.timer).toEqual({ phase: "idle" });
    expect(result.state.streak).toEqual(app.streak);
    expect(result.state.draft).toEqual({
      title: "Task",
      category: "Work",
      notes: "",
    });
  });
  it("ignores discardFocus outside focus", () => {
    expect(transition(initialState, { type: "discardFocus" }, 0).state).toEqual(
      initialState,
    );
  });

  it("stores only draft fields on editDraft", () => {
    const { state } = transition(
      initialState,
      { type: "editDraft", title: "a" },
      0,
    );
    expect(state.draft).toEqual({ title: "a", category: "", notes: "" });
  });

  it("keeps scaled durations in whole seconds", () => {
    const { state } = transition(initialState, { type: "startFocus" }, 0, 7);
    expect(state.timer).toMatchObject({ phase: "focus", plannedSec: 214 });
  });
  it("keeps title and category for the next focus after endFocus, and clears notes", () => {
    let app = transition(
      initialState,
      { type: "editDraft", title: "Task", category: "Work", notes: "note" },
      0,
    ).state;
    app = transition(app, { type: "startFocus" }, 0).state;
    const { state } = transition(app, { type: "endFocus" }, 1_000);
    expect(state.draft).toEqual({ title: "Task", category: "Work", notes: "" });
  });
  it("records an empty focus title as an empty string", () => {
    const app = transition(initialState, { type: "startFocus" }, 0).state;
    const { record } = transition(app, { type: "endFocus" }, 1_000);
    expect(record).toMatchObject({ title: "", category: "", notes: "" });
  });
});

describe("break actions", () => {
  const breakState = (kind: "short_break" | "long_break"): AppState => ({
    ...structuredClone(initialState),
    timer: { phase: "break", kind, startedAt: 0, plannedSec: 5 },
    streak: { completed: 4, lastPhaseEndedAt: 0 },
    draft: { title: "next", category: "dev", notes: "" },
  });
  it("records the break and starts focus in one step", () => {
    const result = transition(
      breakState("long_break"),
      { type: "startFocus" },
      2_000,
      60,
    );
    expect(result.record).toMatchObject({
      kind: "long_break",
      actual_sec: 2,
      outcome: "ended_early",
    });
    expect(result.state.timer).toEqual({
      phase: "focus",
      startedAt: 2_000,
      plannedSec: 25,
    });
    expect(result.state.streak).toEqual({
      completed: 0,
      lastPhaseEndedAt: 2_000,
    });
    expect(result.state.draft.title).toBe("next");
  });
  it("discards the break without a record or streak change", () => {
    const app = breakState("short_break");
    const result = transition(app, { type: "discardBreak" }, 2_000, 60);
    expect(result.record).toBeNull();
    expect(result.state.timer).toEqual({ phase: "idle" });
    expect(result.state.streak).toEqual(app.streak);
    expect(result.state.draft).toEqual(app.draft);
  });
});

describe("edit times", () => {
  const focus = transition(initialState, { type: "startFocus" }, 600_000).state;
  it("moves the start and sets the planned minutes", () => {
    const app = transition(
      focus,
      { type: "editTimes", startedAt: 300_000, plannedMin: 30 },
      700_000,
    ).state;
    expect(app.timer).toEqual({
      phase: "focus",
      startedAt: 300_000,
      plannedSec: 1800,
    });
    const ended = transition(app, { type: "endFocus" }, 2_100_000);
    expect(ended.record).toMatchObject({ actual_sec: 1800, planned_sec: 1800 });
    expect(ended.record?.outcome).toBe("completed");
  });
  it("keeps the start at or before now and the duration at least a minute", () => {
    const app = transition(
      focus,
      { type: "editTimes", startedAt: 900_000, plannedMin: 0 },
      700_000,
    ).state;
    expect(app.timer).toMatchObject({ startedAt: 700_000, plannedSec: 60 });
  });
  it("jumps to overtime when the new end is already past", () => {
    const app = transition(
      focus,
      { type: "editTimes", startedAt: 0, plannedMin: 5 },
      600_000,
    ).state;
    expect(view(app.timer, 600_000)).toEqual({
      remainingSec: 0,
      overtimeSec: 300,
    });
  });
  it("scales the minutes and edits breaks too; ignores idle", () => {
    const brk: AppState = {
      ...structuredClone(initialState),
      timer: {
        phase: "break",
        kind: "short_break",
        startedAt: 0,
        plannedSec: 5,
      },
    };
    const app = transition(
      brk,
      { type: "editTimes", startedAt: 0, plannedMin: 10 },
      1000,
      60,
    ).state;
    expect(app.timer).toMatchObject({ plannedSec: 10 });
    if (app.timer.phase === "idle") throw new Error("break expected");
    expect(plannedMinutes(app.timer, 60)).toBe(10);
    expect(
      transition(
        initialState,
        { type: "editTimes", startedAt: 0, plannedMin: 10 },
        1000,
      ).state.timer,
    ).toEqual({ phase: "idle" });
  });
});
