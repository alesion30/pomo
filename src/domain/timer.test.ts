import { describe, expect, it } from "vitest";
import { initialState, transition, view } from "./timer";

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
});

describe("draft and time scale", () => {
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
  it("records an empty focus title as an empty string", () => {
    const app = transition(initialState, { type: "startFocus" }, 0).state;
    const { record } = transition(app, { type: "endFocus" }, 1_000);
    expect(record).toMatchObject({ title: "", category: "", notes: "" });
  });
});
