import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { browser } from "@wdio/globals";

declare function describe(title: string, fn: () => void): void;
declare function it(title: string, fn: () => Promise<void>): void;

// 埋め込みの WebDriver は、セレクタが複数の要素に当たるとエラーにする。行はタイトルで探し、その中のボタンを押す。
async function itemWith(text: string) {
  for (const item of await browser.$$('[data-testid="history-item"]'))
    if ((await item.getText()).includes(text)) return item;
  throw new Error(`no history item with ${text}`);
}

describe("history", () => {
  it("adds, edits, and deletes a record of today", async () => {
    const dataDir = process.env.XDG_DATA_HOME;
    assert(dataDir, "XDG_DATA_HOME must be set by the E2E runner");
    const log = () => {
      try {
        return readFileSync(`${dataDir}/pomo/sessions.jsonl`, "utf8");
      } catch {
        return "";
      }
    };
    execFileSync("scripts/pomoctl", ["tray-click"]);
    await browser.$('[data-testid="open-history"]').click();
    await browser.$('[data-testid="history"]').waitForDisplayed();

    await browser.$('[data-testid="history-add"]').click();
    await browser.$('[data-testid="record-title"]').setValue("E2E history");
    await browser.$('[data-testid="record-save"]').click();
    await browser.waitUntil(() => log().includes("E2E history"));
    await browser.waitUntil(async () => {
      try {
        return Boolean(await itemWith("E2E history"));
      } catch {
        return false;
      }
    });
    await (await itemWith("E2E history"))
      .$('[data-testid="history-edit"]')
      .click();
    const title = browser.$('[data-testid="record-title"]');
    await title.clearValue();
    await title.setValue("E2E history edited");
    await browser.$('[data-testid="record-save"]').click();
    await browser.waitUntil(() => log().includes("E2E history edited"));
    assert.equal(log().match(/E2E history/g)?.length, 1);

    await (await itemWith("E2E history edited"))
      .$('[data-testid="history-delete"]')
      .click();
    await browser.$('[data-testid="delete-record-confirm-ok"]').click();
    await browser.waitUntil(() => !log().includes("E2E history"));
    await browser.$('[data-testid="history-close"]').click();
    await browser.$('[data-testid="open-history"]').waitForDisplayed();
  });
});
