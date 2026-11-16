import { describe, expect, it } from "vitest";
import { localIso8601, type SessionRecord } from "../domain/record";
import { focusOfDay, toInput, toRecord, totalSec, validate } from "./records";

const at = (d: number, h: number, m = 0) =>
  new Date(2026, 10, d, h, m).getTime();
const rec = (id: string, start: number, kind = "focus"): SessionRecord =>
  ({
    id,
    kind,
    title: id,
    category: "",
    notes: "",
    started_at: localIso8601(start),
    ended_at: localIso8601(start + 1_500_000),
    planned_sec: 1500,
    actual_sec: 1500,
    outcome: "completed",
  }) as SessionRecord;

describe("history records", () => {
  it("lists the focus records started that day, newest first", () => {
    const records = [
      rec("early", at(16, 0, 0)),
      rec("late", at(16, 23, 50)),
      rec("break", at(16, 12), "short_break"),
      rec("yesterday", at(15, 23, 59)),
      rec("tomorrow", at(17, 0)),
    ];
    const day = focusOfDay(records, new Date(2026, 10, 16, 15));
    expect(day.map((r) => r.id)).toEqual(["late", "early"]);
    expect(totalSec(day)).toBe(3000);
  });
  it("adds a manual record as completed with the actual time as planned", () => {
    const record = toRecord({
      title: " 手で足した ",
      category: "開発",
      notes: "",
      startedAt: at(16, 9),
      endedAt: at(16, 9, 40),
    });
    expect(record).toMatchObject({
      kind: "focus",
      title: "手で足した",
      planned_sec: 2400,
      actual_sec: 2400,
      outcome: "completed",
    });
  });
  it("keeps id and planned time when editing and recomputes the outcome", () => {
    const base = rec("x", at(16, 9));
    const edited = toRecord({ ...toInput(base), endedAt: at(16, 9, 10) }, base);
    expect(edited).toMatchObject({
      id: "x",
      planned_sec: 1500,
      actual_sec: 600,
      outcome: "ended_early",
    });
  });
  it("rejects an end not after the start or later than now", () => {
    const input = toInput(rec("x", at(16, 9)));
    expect(validate(input, at(16, 12))).toBeNull();
    expect(
      validate({ ...input, endedAt: input.startedAt }, at(16, 12)),
    ).toContain("開始より後");
    expect(validate(input, at(16, 9, 5))).toContain("今より前");
  });
});
