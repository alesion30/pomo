import { execFileSync } from "node:child_process";
import { browser, expect } from "@wdio/globals";

declare function describe(title: string, fn: () => void): void;
declare function it(title: string, fn: () => Promise<void>): void;

describe("phase due main window", () => {
  it("shows focus end and starts a break", async () => {
    execFileSync("scripts/pomoctl", ["tray-click"]);
    await $("[data-testid='title-input']").setValue("front test");
    await $("[data-testid='start']").click();
    await browser.pause(27_000);
    const screen = await $("[data-testid='front-screen']").getAttribute(
      "data-screen",
    );
    expect(screen).toBe("focus-end");
    await $("[data-testid='front-notes']").setValue("e2e note");
    await $("[data-testid='front-start-break']").click();
    await expect($("[data-testid='phase']")).toHaveText("短い休憩");
  });
});
