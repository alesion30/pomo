import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { browser } from "@wdio/globals";

declare function describe(title: string, fn: () => void): void;
declare function it(title: string, fn: () => Promise<void>): void;

describe("pomo boot", () => {
  it("shows the idle main window and exposes the tray title", async () => {
    execFileSync("scripts/pomoctl", ["tray-click"], { encoding: "utf8" });
    assert((await browser.$("body").getText()).includes("待機中"));
    assert.equal(
      execFileSync("scripts/pomoctl", ["title"], { encoding: "utf8" }).trim(),
      "pomo",
    );
    const output = process.env.POMO_SHOT_DIR ?? "e2e/out";
    mkdirSync(output, { recursive: true });
    await browser.saveScreenshot(join(output, "pomo-1-boot.png"));
  });
});
