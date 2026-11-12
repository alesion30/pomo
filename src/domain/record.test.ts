import { beforeAll, describe, expect, it } from "vitest";
import { localIso8601, makeRecord } from "./record";

beforeAll(() => {
  (
    globalThis as unknown as {
      process: { env: Record<string, string | undefined> };
    }
  ).process.env.TZ = "Asia/Tokyo";
});
describe("session records", () => {
  it("formats local ISO timestamps with timezone offset", () => {
    expect(localIso8601(Date.UTC(2026, 10, 11, 8, 48, 59))).toBe(
      "2026-11-11T17:48:59+09:00",
    );
  });
  it("keeps break titles null", () => {
    const record = makeRecord({
      kind: "short_break",
      title: null,
      category: null,
      notes: null,
      planned_sec: 300,
      actual_sec: 10,
      outcome: "ended_early",
      startedAt: 0,
      endedAt: 10_000,
    });
    expect(record.title).toBeNull();
  });
});
