// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  invoke: vi.fn((..._args: unknown[]) => Promise.resolve(null as unknown)),
}));
vi.mock("@tauri-apps/api/core", () => ({ invoke: mock.invoke }));
vi.mock("@tauri-apps/api/app", () => ({
  getVersion: () => Promise.resolve("0.7.0"),
}));

import { Settings } from "./Settings";

const config = {
  categories: ["開発", "調査", "雑務"],
  colors: {},
  error: null,
};
const renderSettings = (save = vi.fn(() => Promise.resolve())) => {
  render(
    <Settings
      config={config}
      phase="idle"
      saveCategories={save}
      onClose={() => {}}
    />,
  );
  return save;
};

describe("Settings", () => {
  afterEach(() => {
    cleanup();
    mock.invoke.mockClear();
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
