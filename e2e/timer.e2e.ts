import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { browser } from "@wdio/globals";
import { setInput } from "./form";

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
    // メニューバーは「タイトル - 残り時間」の順に出す。
    await browser.waitUntil(() =>
      /^E2E task - \d\d:\d\d$/.test(
        execFileSync("scripts/pomoctl", ["title"], { encoding: "utf8" }).trim(),
      ),
    );
    await browser.$('[data-testid="end"]').click();
    await browser.$('[data-testid="end-cancel"]').click();
    assert.equal(await browser.$('[data-testid="phase"]').getText(), "集中");
    await browser.$('[data-testid="end"]').click();
    await browser.$('[data-testid="end-confirm-ok"]').click();
    await browser.waitUntil(
      async () =>
        (await browser.$('[data-testid="phase"]').getText()) === "待機中",
    );
  });
  it("starts a break immediately from focus", async () => {
    execFileSync("scripts/pomoctl", ["tray-click"]);
    await browser.$('[data-testid="start"]').click();
    await browser.waitUntil(
      async () =>
        (await browser.$('[data-testid="phase"]').getText()) === "集中",
    );
    await browser.$('[data-testid="break-now"]').click();
    await browser.$('[data-testid="break-confirm-ok"]').click();
    await browser.waitUntil(
      async () =>
        (await browser.$('[data-testid="phase"]').getText()) === "短い休憩",
    );
    // 休憩中は次の集中のタイトルを入れ、振り返りの欄は出さない。
    assert.equal(
      await browser.$('[data-testid="wrapup-notes"]').isExisting(),
      false,
    );
    await browser.$('[data-testid="title-input"]').setValue("Next task");
    await browser.$('[data-testid="start-focus"]').click();
    await browser.waitUntil(
      async () =>
        (await browser.$('[data-testid="phase"]').getText()) === "集中",
    );
    assert.equal(
      await browser.$('[data-testid="title-input"]').getValue(),
      "Next task",
    );
    await browser.$('[data-testid="break-now"]').click();
    await browser.$('[data-testid="break-confirm-ok"]').click();
    await browser.$('[data-testid="discard-break"]').click();
    await browser.$('[data-testid="discard-break-confirm-ok"]').click();
    await browser.waitUntil(
      async () =>
        (await browser.$('[data-testid="phase"]').getText()) === "待機中",
    );
  });
  it("discards focus after confirmation", async () => {
    execFileSync("scripts/pomoctl", ["tray-click"]);
    const title = await browser.$('[data-testid="title-input"]');
    await title.setValue("Discarded task");
    await browser.$('[data-testid="start"]').click();
    await browser.waitUntil(
      async () =>
        (await browser.$('[data-testid="phase"]').getText()) === "集中",
    );
    await browser.$('[data-testid="discard"]').click();
    await browser.$('[data-testid="discard-confirm-ok"]').click();
    await browser.waitUntil(
      async () =>
        (await browser.$('[data-testid="phase"]').getText()) === "待機中",
    );
    assert.equal(
      await browser.$('[data-testid="title-input"]').getValue(),
      "Discarded task",
    );
  });
  it("edits the start and duration into overtime", async () => {
    execFileSync("scripts/pomoctl", ["tray-click"]);
    await browser.$('[data-testid="title-input"]').setValue("Edited task");
    await browser.$('[data-testid="start"]').click();
    await browser.$('[data-testid="time-range"]').click();
    const clock = (d: Date) =>
      `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    const start = new Date(Date.now() - 10 * 60_000);
    start.setSeconds(0, 0);
    await setInput("time-start", clock(start));
    await setInput("time-minutes", "1");
    await browser.$('[data-testid="time-save"]').click();
    // 終了が過去になったので、−5 分と同じくすぐ超過に入り、ウィンドウの中は集中終了の画面になる。
    await browser.$('[data-testid="front-screen"]').waitForDisplayed();
    await browser.$('[data-testid="front-skip"]').click();
    const dataDir = process.env.XDG_DATA_HOME;
    assert(dataDir, "XDG_DATA_HOME must be set by the E2E runner");
    const last = () =>
      JSON.parse(
        readFileSync(`${dataDir}/pomo/sessions.jsonl`, "utf8")
          .trim()
          .split("\n")
          .slice(-1)[0] ?? "{}",
      );
    await browser.waitUntil(() => last().title === "Edited task");
    assert.equal(new Date(last().started_at).getTime(), start.getTime());
    assert.equal(last().planned_sec, 1);
    assert.equal(last().outcome, "completed");
  });
});
