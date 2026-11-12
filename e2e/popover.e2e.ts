import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { browser } from "@wdio/globals";

declare function describe(title: string, fn: () => void): void;
declare function it(title: string, fn: () => Promise<void>): void;

describe("popover memo inputs", () => {
  it("saves focus notes and suggests recent categories", async () => {
    execFileSync("scripts/pomoctl", ["tray-click"], { encoding: "utf8" });
    // 前の spec が集中や休憩を残していることがあるので、待機に戻してから始める。
    const phase = browser.$('[data-testid="phase"]');
    if ((await phase.getText()) !== "待機中")
      await browser.$('[data-testid="end"]').click();
    const skip = browser.$('[data-testid="skip-break"]');
    if (await skip.isExisting()) await skip.click();
    await browser.waitUntil(async () => (await phase.getText()) === "待機中");
    const title = await browser.$('[data-testid="title-input"]');
    await title.setValue("E2E task");
    await browser.$('[data-testid="category-input"]').setValue("E2E category");
    await browser.$('[data-testid="notes-input"]').setValue("memo line");
    await browser.$('[data-testid="start"]').click();
    await browser.$('[data-testid="end"]').click();
    const dataDir = process.env.XDG_DATA_HOME;
    assert(dataDir, "XDG_DATA_HOME must be set by the E2E runner");
    const lastRecord = () => {
      const lines = readFileSync(`${dataDir}/pomo/sessions.jsonl`, "utf8")
        .trim()
        .split("\n");
      return JSON.parse(lines[lines.length - 1] ?? "{}");
    };
    // 記録の追記はクリックの後に非同期で行われる。
    await browser.waitUntil(async () => lastRecord().title === "E2E task");
    const record = lastRecord();
    assert.equal(record.category, "E2E category");
    assert.equal(record.notes, "memo line");
    await browser.$('[data-testid="start"]').click();
    await browser.$('[data-testid="category-input"]').setValue("E");
    await browser.$('[data-testid="category-suggestion"]').waitForDisplayed();
    assert.equal(
      await browser.$('[data-testid="category-suggestion"]').getText(),
      "E2E category",
    );
  });
});
