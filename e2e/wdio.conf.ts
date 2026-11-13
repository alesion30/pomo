const app = process.env.POMO_APP ?? "src-tauri/target/debug/pomo";

export const config = {
  runner: "local",
  specs: ["./*.e2e.ts"],
  maxInstances: 1,
  framework: "mocha",
  reporters: ["spec"],
  services: [
    [
      "@wdio/tauri-service",
      {
        appBinaryPath: app,
        driverProvider: "embedded",
        windowLabel: "main",
      },
    ],
  ],
  capabilities: [
    { browserName: "tauri", "tauri:options": { application: app } },
  ],
  mochaOpts: { timeout: 60_000 },
  // tauri-service は明示的な切り替えがない間、操作のたびに IPC でフォーカスを確かめ、毎回 5 秒待つ。
  // ウィンドウは main の 1 枚なので、最初に明示的に切り替えてこの確認を止める。
  before: async () => {
    const { browser } = await import("@wdio/globals");
    await browser.switchToWindow("main");
  },
};
