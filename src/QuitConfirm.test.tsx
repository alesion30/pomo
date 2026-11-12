// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  listener: null as ((event: unknown) => void) | null,
  invoke: vi.fn(),
}));
vi.mock("@tauri-apps/api/core", () => ({ invoke: mock.invoke }));
vi.mock("@tauri-apps/api/event", () => ({
  listen: (_: string, cb: (event: unknown) => void) => {
    mock.listener = cb;
    return Promise.resolve(() => {});
  },
}));

import { QuitConfirm } from "./QuitConfirm";

describe("QuitConfirm", () => {
  afterEach(() => {
    document.body.replaceChildren();
    mock.invoke.mockClear();
  });
  it("confirms quit and supports cancel", async () => {
    render(<QuitConfirm />);
    await vi.waitFor(() => expect(mock.listener).not.toBeNull());
    await act(async () => {
      mock.listener?.({});
    });
    expect(screen.getByTestId("quit-confirm")).toBeTruthy();
    fireEvent.click(screen.getByTestId("quit-confirm-cancel"));
    expect(screen.queryByTestId("quit-confirm")).toBeNull();
    expect(mock.invoke).not.toHaveBeenCalled();
    await act(async () => {
      mock.listener?.({});
    });
    fireEvent.click(screen.getByTestId("quit-confirm-ok"));
    expect(mock.invoke).toHaveBeenCalledWith("quit_app");
  });
});
