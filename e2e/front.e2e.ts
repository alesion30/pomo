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
    await expect($("[data-testid='popover']")).toHaveAttribute(
      "data-tone",
      "break",
    );
  });

  it("keeps a window closed before the due on screen after starting a break", async () => {
    // インストールした pomo も同じ名前でウィンドウを出すので、E2E が起動した pomo の PID で絞る。
    const pid = Number(
      execFileSync(
        "pgrep",
        ["-nf", process.env.POMO_APP ?? "src-tauri/target/debug/pomo"],
        { encoding: "utf8" },
      ).trim(),
    );
    const onScreen = () =>
      JSON.parse(
        execFileSync("swift", ["scripts/onscreen.swift", "pomo"], {
          encoding: "utf8",
        }),
      ).some((window: { pid: number }) => window.pid === pid);
    await $("[data-testid='discard-break']").click();
    await $("[data-testid='discard-break-confirm-ok']").click();
    await $("[data-testid='start']").click();
    execFileSync("scripts/pomoctl", ["close"]);
    await browser.waitUntil(() => !onScreen());
    const startBreak = $("[data-testid='front-start-break']");
    await startBreak.waitForExist({ timeout: 40_000 });
    await browser.waitUntil(onScreen);
    await startBreak.click();
    await expect($("[data-testid='popover']")).toHaveAttribute(
      "data-tone",
      "break",
    );
    await browser.pause(1_000);
    expect(onScreen()).toBe(true);
    expect(
      execFileSync("scripts/pomoctl", ["key-window"], {
        encoding: "utf8",
      }).trim(),
    ).toBe("main");
  });
});
