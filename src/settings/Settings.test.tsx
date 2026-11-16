// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  invoke: vi.fn((..._args: unknown[]) => Promise.resolve(null as unknown)),
  listeners: new Map<string, (event: { payload: unknown }) => void>(),
}));
vi.mock("@tauri-apps/api/core", () => ({ invoke: mock.invoke }));
vi.mock("@tauri-apps/api/event", () => ({
  listen: (name: string, handler: (event: { payload: unknown }) => void) => {
    mock.listeners.set(name, handler);
    return Promise.resolve(() => mock.listeners.delete(name));
  },
}));
vi.mock("@tauri-apps/api/app", () => ({
  getVersion: () => Promise.resolve("0.7.0"),
}));

import { Settings } from "./Settings";

const config = {
  categories: ["開発", "調査", "雑務"],
  colors: {},
  error: null,
};
const renderSettings = (
  save = vi.fn(() => Promise.resolve()),
  phase: "idle" | "focus" | "break" = "idle",
) => {
  render(
    <Settings
      config={config}
      phase={phase}
      saveCategories={save}
      onClose={() => {}}
    />,
  );
  return save;
};

describe("Settings", () => {
  afterEach(() => {
    cleanup();
    mock.invoke.mockReset();
    mock.invoke.mockImplementation(() => Promise.resolve(null));
  });
  it("adds, renames, moves, and deletes categories through saveCategories", () => {
    const save = renderSettings();
    fireEvent.change(screen.getByTestId("category-new"), {
      target: { value: "設計" },
    });
    fireEvent.click(screen.getByTestId("category-add"));
    expect(save).toHaveBeenLastCalledWith(["開発", "調査", "雑務", "設計"], {});
    const [first] = screen.getAllByTestId("category-name");
    if (!first) throw new Error("no category row");
    fireEvent.change(first, { target: { value: "実装" } });
    fireEvent.blur(first);
    expect(save).toHaveBeenLastCalledWith(["実装", "調査", "雑務"], {});
    fireEvent.click(screen.getByRole("button", { name: "調査 を上へ" }));
    expect(save).toHaveBeenLastCalledWith(["調査", "開発", "雑務"], {});
    fireEvent.click(screen.getByRole("button", { name: "雑務 を削除" }));
    expect(save).toHaveBeenLastCalledWith(["開発", "調査"], {});
  });
  it("chooses a color, moves it on rename, and clears it with auto", () => {
    const save = vi.fn(() => Promise.resolve());
    render(
      <Settings
        config={{ ...config, colors: { 調査: "rose" } }}
        phase="idle"
        saveCategories={save}
        onClose={() => {}}
      />,
    );
    const [, second] = screen.getAllByTestId("category-color");
    expect(second?.getAttribute("data-hue")).toBe("3");
    fireEvent.click(screen.getByRole("button", { name: "開発 の色" }));
    fireEvent.click(screen.getByRole("button", { name: "緑" }));
    expect(save).toHaveBeenLastCalledWith(["開発", "調査", "雑務"], {
      開発: "leaf",
      調査: "rose",
    });
    const names = screen.getAllByTestId("category-name");
    fireEvent.change(names[1] as HTMLElement, { target: { value: "調べ物" } });
    fireEvent.blur(names[1] as HTMLElement);
    expect(save).toHaveBeenLastCalledWith(["開発", "調べ物", "雑務"], {
      調べ物: "rose",
    });
    fireEvent.click(screen.getByRole("button", { name: "調査 の色" }));
    fireEvent.click(screen.getByTestId("category-color-auto"));
    expect(save).toHaveBeenLastCalledWith(["開発", "調査", "雑務"], {});
  });
  it("shows the version and the result of an update check", async () => {
    mock.invoke.mockImplementation((command) =>
      Promise.resolve(command === "check_update" ? "0.8.0" : null),
    );
    renderSettings();
    expect((await screen.findByText("pomo v0.7.0")).textContent).toBe(
      "pomo v0.7.0",
    );
    fireEvent.click(screen.getByTestId("check-update"));
    expect((await screen.findByTestId("update-button")).textContent).toBe(
      "更新あり (v0.8.0)",
    );
  });
  it("shows an update found by the background check and applies it only while idle", async () => {
    mock.invoke.mockImplementation((command) =>
      Promise.resolve(command === "update_status" ? "0.8.0" : null),
    );
    renderSettings(undefined, "focus");
    const button = (await screen.findByTestId(
      "update-button",
    )) as HTMLButtonElement;
    expect(button.textContent).toBe("更新あり (v0.8.0)");
    expect(button.disabled).toBe(true);
    cleanup();
    renderSettings();
    fireEvent.click(await screen.findByTestId("update-button"));
    expect(mock.invoke).toHaveBeenCalledWith("apply_update");
  });
  it("shows an update announced while open", async () => {
    renderSettings();
    expect(screen.queryByTestId("update-button")).toBeNull();
    await act(async () => {
      mock.listeners.get("update-available")?.({ payload: "0.9.0" });
    });
    expect(screen.getByTestId("update-button").textContent).toBe(
      "更新あり (v0.9.0)",
    );
  });
  it("reads the update again when the window comes back to the front", async () => {
    renderSettings();
    await act(async () => {});
    expect(screen.queryByTestId("update-button")).toBeNull();
    mock.invoke.mockImplementation((command) =>
      Promise.resolve(command === "update_status" ? "0.9.0" : null),
    );
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(screen.getByTestId("update-button").textContent).toBe(
      "更新あり (v0.9.0)",
    );
  });
  it("shows why applying the update failed", async () => {
    mock.invoke.mockImplementation((command) =>
      command === "apply_update"
        ? Promise.reject("署名を検証できません")
        : Promise.resolve(command === "update_status" ? "0.8.0" : null),
    );
    renderSettings();
    fireEvent.click(await screen.findByTestId("update-button"));
    expect((await screen.findByTestId("update-error")).textContent).toBe(
      "更新に失敗しました: 署名を検証できません",
    );
    expect(
      (screen.getByTestId("update-button") as HTMLButtonElement).disabled,
    ).toBe(false);
  });
  it("shows a broken config error", () => {
    render(
      <Settings
        config={{
          categories: [],
          colors: {},
          error: "config.json を読めません",
        }}
        phase="idle"
        saveCategories={vi.fn()}
        onClose={() => {}}
      />,
    );
    expect(screen.getByTestId("config-error").textContent).toBe(
      "config.json を読めません",
    );
  });
});
