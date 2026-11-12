const app = process.env.POMO_APP ?? "src-tauri/target/debug/pomo";

export const config = {
  runner: "local",
  specs: ["./smoke.e2e.ts"],
  maxInstances: 1,
  framework: "mocha",
  reporters: ["spec"],
  services: [
    [
      "@wdio/tauri-service",
      {
        appBinaryPath: app,
        driverProvider: "embedded",
        windowLabel: "popover",
      },
    ],
  ],
  capabilities: [
    { browserName: "tauri", "tauri:options": { application: app } },
  ],
  mochaOpts: { timeout: 60_000 },
};
