import { browser, expect } from "@wdio/globals";

declare function describe(title: string, fn: () => void): void;
declare function it(title: string, fn: () => Promise<void>): void;
const tauriBrowser = browser as typeof browser & {
  tauri: { switchWindow(label: string): Promise<void> };
};

describe("phase due front window", () => {
  it("shows focus end and starts a break", async () => {
    await tauriBrowser.tauri.switchWindow("popover");
    await $("[data-testid='title-input']").setValue("front test");
    await $("[data-testid='start']").click();
    await browser.pause(27_000);
    await tauriBrowser.tauri.switchWindow("front");
    const screen = await $("[data-testid='front-screen']").getAttribute(
      "data-screen",
    );
    expect(screen).toBe("focus-end");
    await $("[data-testid='front-notes']").setValue("e2e note");
    await $("[data-testid='front-start-break']").click();
    await tauriBrowser.tauri.switchWindow("popover");
    await expect($("[data-testid='phase']")).toHaveText("短い休憩");
  });
});
