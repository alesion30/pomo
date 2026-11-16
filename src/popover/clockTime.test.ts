import { describe, expect, it } from "vitest";
import { formatClock, resolveStart } from "./clockTime";

const at = (h: number, m: number, s = 0) =>
  new Date(2026, 10, 16, h, m, s).getTime();

describe("time range", () => {
  it("formats in 24 hours", () => {
    expect(formatClock(at(9, 5))).toBe("09:05");
    expect(formatClock(at(23, 50))).toBe("23:50");
  });
  it("keeps the original start when the time is unchanged", () => {
    expect(resolveStart("10:47", at(10, 47, 31), at(11, 0))).toBe(
      at(10, 47, 31),
    );
  });
  it("uses today for past times and yesterday across midnight", () => {
    expect(resolveStart("10:30", at(10, 47), at(11, 0))).toBe(at(10, 30));
    expect(resolveStart("23:50", at(0, 5), at(0, 10))).toBe(
      at(23, 50) - 24 * 3_600_000,
    );
  });
  it("rejects a start later than now and malformed input", () => {
    expect(resolveStart("11:05", at(10, 47), at(11, 0))).toBeNull();
    expect(resolveStart("", at(10, 47), at(11, 0))).toBeNull();
  });
});
