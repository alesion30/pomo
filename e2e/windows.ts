import { browser } from "@wdio/globals";

// ウィンドウが 2 つあると、セッションが最初にどちらを向くかは決まらない。
// tauri-service の switchWindow は IPC の確認で毎回 5 秒待つので、WebDriver のハンドルで直接切り替える。
const handles: Record<string, string> = {};

export async function switchTo(label: "popover" | "front") {
  if (!handles[label]) {
    for (const handle of await browser.getWindowHandles()) {
      await browser.switchToWindow(handle);
      const found = (await browser.execute(() =>
        document.querySelector('[data-testid="front-screen"]')
          ? "front"
          : "popover",
      )) as string;
      handles[found] = handle;
    }
  }
  await browser.switchToWindow(handles[label]);
}
