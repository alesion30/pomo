import { durations, LONG_EVERY } from "./constants";
import { makeRecord, type SessionRecord } from "./record";

export type BreakKind = "short_break" | "long_break";
export type TimerState =
  | { phase: "idle"; offer?: BreakKind }
  | { phase: "focus"; startedAt: number; plannedSec: number }
  | { phase: "break"; kind: BreakKind; startedAt: number; plannedSec: number };
export type AppState = {
  timer: TimerState;
  streak: { completed: number; lastPhaseEndedAt: number | null };
  draft: { title: string; category: string; notes: string };
};
export type Command =
  | { type: "startFocus" }
  | { type: "endFocus" }
  | { type: "discardFocus" }
  | { type: "startBreak" }
  | { type: "skipBreak" }
  | { type: "endBreak" }
  | { type: "adjust"; deltaSec: 300 | -300 }
  | { type: "editDraft"; title?: string; category?: string; notes?: string };

export const initialState: AppState = {
  timer: { phase: "idle" },
  streak: { completed: 0, lastPhaseEndedAt: null },
  draft: { title: "", category: "", notes: "" },
};

export function view(state: TimerState, now: number) {
  if (state.phase === "idle") return { remainingSec: 0, overtimeSec: 0 };
  const elapsed = Math.floor(Math.max(0, now - state.startedAt) / 1000);
  return {
    remainingSec: Math.max(0, state.plannedSec - elapsed),
    overtimeSec: Math.max(0, elapsed - state.plannedSec),
  };
}

export function transition(
  app: AppState,
  command: Command,
  now: number,
  scale = 1,
): { state: AppState; record: SessionRecord | null } {
  const config = durations(scale);
  const state = structuredClone(app);
  let record: SessionRecord | null = null;
  if (command.type === "editDraft") {
    const { type: _, ...fields } = command;
    state.draft = { ...state.draft, ...fields };
  }
  if (command.type === "startFocus" && state.timer.phase === "idle") {
    if (
      state.streak.lastPhaseEndedAt !== null &&
      now - state.streak.lastPhaseEndedAt >= config.streakGapMs
    )
      state.streak.completed = 0;
    state.timer = { phase: "focus", startedAt: now, plannedSec: config.focus };
  }
  if (command.type === "endFocus" && state.timer.phase === "focus") {
    const phase = state.timer;
    const actual = Math.floor(Math.max(0, now - phase.startedAt) / 1000);
    const completed = actual >= phase.plannedSec;
    record = makeRecord({
      kind: "focus",
      ...state.draft,
      // spec では null は休憩の行だけ。集中の行は空のままでも文字列で残す。
      title: state.draft.title,
      category: state.draft.category,
      notes: state.draft.notes,
      startedAt: phase.startedAt,
      endedAt: now,
      planned_sec: phase.plannedSec,
      actual_sec: actual,
      outcome: completed ? "completed" : "ended_early",
    });
    if (completed) state.streak.completed++;
    state.streak.lastPhaseEndedAt = now;
    state.timer = completed
      ? {
          phase: "idle",
          offer:
            state.streak.completed >= LONG_EVERY ? "long_break" : "short_break",
        }
      : { phase: "idle" };
    state.draft.title = "";
    state.draft.notes = "";
  }
  if (command.type === "startBreak" && state.timer.phase === "focus") {
    const ended = transition(state, { type: "endFocus" }, now, scale);
    if (ended.state.timer.phase === "idle" && !ended.state.timer.offer)
      ended.state.timer.offer = "short_break";
    const started = transition(ended.state, { type: "startBreak" }, now, scale);
    return { ...started, record: ended.record };
  }
  if (command.type === "discardFocus" && state.timer.phase === "focus") {
    state.timer = { phase: "idle" };
    state.draft.notes = "";
  }
  if (
    command.type === "startBreak" &&
    state.timer.phase === "idle" &&
    state.timer.offer
  )
    state.timer = {
      phase: "break",
      kind: state.timer.offer,
      startedAt: now,
      plannedSec:
        state.timer.offer === "long_break"
          ? config.longBreak
          : config.shortBreak,
    };
  if (command.type === "skipBreak" && state.timer.phase === "idle")
    state.timer = { phase: "idle" };
  if (command.type === "endBreak" && state.timer.phase === "break") {
    const phase = state.timer;
    const actual = Math.floor(Math.max(0, now - phase.startedAt) / 1000);
    record = makeRecord({
      kind: phase.kind,
      title: null,
      category: null,
      notes: null,
      startedAt: phase.startedAt,
      endedAt: now,
      planned_sec: phase.plannedSec,
      actual_sec: actual,
      outcome: actual >= phase.plannedSec ? "completed" : "ended_early",
    });
    state.streak.lastPhaseEndedAt = now;
    if (phase.kind === "long_break") state.streak.completed = 0;
    state.timer = { phase: "idle" };
  }
  if (command.type === "adjust" && state.timer.phase !== "idle") {
    const timer = state.timer;
    if (command.deltaSec > 0) timer.plannedSec += config.adjust;
    else if (view(timer, now).remainingSec < config.adjust)
      // 残りが減らす幅より短ければ、予定時間を経過時間にそろえて、すぐ超過にする。
      timer.plannedSec = Math.floor(Math.max(0, now - timer.startedAt) / 1000);
    else
      timer.plannedSec = Math.max(
        config.minimum,
        timer.plannedSec - config.adjust,
      );
  }
  return { state, record };
}
