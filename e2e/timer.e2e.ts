import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { browser } from "@wdio/globals";

declare function describe(title: string, fn: () => void): void;
declare function it(title: string, fn: () => Promise<void>): void;

describe("timer", () => {
  it("starts and ends a focus session", async () => {
    execFileSync("scripts/pomoctl", ["tray-click"]);
    const title = await browser.$('[data-testid="title-input"]');
    await title.setValue("E2E task");
    await browser.$('[data-testid="start"]').click();
    await browser.waitUntil(
      async () =>
        (await browser.$('[data-testid="phase"]').getText()) === "集中",
    );
    assert.equal(await browser.$('[data-testid="phase"]').getText(), "集中");
    await browser.$('[data-testid="end"]').click();
    await browser.waitUntil(
      async () =>
        (await browser.$('[data-testid="phase"]').getText()) === "待機中",
    );
  });
});
