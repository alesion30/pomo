// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UpdateButton } from "./UpdateButton";

describe("UpdateButton", () => {
  afterEach(cleanup);
  it("is enabled only while idle", () => {
    const onApply = vi.fn();
    const { rerender } = render(
      <UpdateButton version="1.2.3" phase="idle" onApply={onApply} />,
    );
    expect(
      (screen.getByTestId("update-button") as HTMLButtonElement).disabled,
    ).toBe(false);
    rerender(<UpdateButton version="1.2.3" phase="focus" onApply={onApply} />);
    expect(
      (screen.getByTestId("update-button") as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("is hidden without an update", () => {
    render(<UpdateButton version={null} phase="idle" onApply={vi.fn()} />);
    expect(screen.queryByTestId("update-button")).toBeNull();
  });

  it("calls onApply when clicked", () => {
    const onApply = vi.fn();
    render(<UpdateButton version="1.2.3" phase="idle" onApply={onApply} />);
    fireEvent.click(screen.getByTestId("update-button"));
    expect(onApply).toHaveBeenCalledOnce();
  });
});
