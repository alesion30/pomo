// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { localIso8601, type SessionRecord } from "../domain/record";

const mock = vi.hoisted(() => ({
  records: [] as unknown[],
  fail: null as string | null,
  invoke: vi.fn(
    (command: string, ..._args: unknown[]): Promise<unknown> =>
      command === "list_records"
        ? Promise.resolve(mock.records)
        : mock.fail
          ? Promise.reject(mock.fail)
          : Promise.resolve(null),
  ),
}));
vi.mock("@tauri-apps/api/core", () => ({ invoke: mock.invoke }));
vi.mock("@tauri-apps/api/event", () => ({
  listen: () => Promise.resolve(() => {}),
}));

import { History } from "./History";

const at = (d: number, h: number, m = 0, s = 0) =>
  new Date(2026, 10, d, h, m, s).getTime();
const rec = (
  id: string,
  start: number,
  end: number,
  more: Partial<SessionRecord> = {},
): SessionRecord => ({
  id,
  kind: "focus",
  title: id,
  category: "",
  notes: "",
  started_at: localIso8601(start),
  ended_at: localIso8601(end),
  planned_sec: (end - start) / 1000,
  actual_sec: (end - start) / 1000,
  outcome: "completed",
  ...more,
});
const now = at(16, 15);
const morning = rec("朝の設計", at(16, 9, 0, 12), at(16, 9, 39, 40), {
  category: "開発",
  notes: "方針を決めた\n残りは明日",
});
const noon = rec("", at(16, 13), at(16, 13, 10), {
  planned_sec: 1500,
  outcome: "ended_early",
});
const yesterday = rec("昨日のレビュー", at(15, 23, 50), at(16, 0, 20));

const open = async (onClose = () => {}) => {
  render(<History now={now} categories={["開発", "調査"]} onClose={onClose} />);
  await waitFor(() =>
    expect(screen.getByTestId("history-add")).toHaveProperty("disabled", false),
  );
};
const saved = (command: string) =>
  mock.invoke.mock.calls.filter(([name]) => name === command);
const change = (testId: string, value: string) =>
  fireEvent.change(screen.getByTestId(testId), { target: { value } });

describe("History", () => {
  afterEach(() => {
    cleanup();
    mock.invoke.mockClear();
    mock.fail = null;
  });
  it("shows today's focus records with the total and moves between days", async () => {
    mock.records = [
      morning,
      noon,
      yesterday,
      { ...rec("休憩", at(16, 10), at(16, 10, 5)), kind: "short_break" },
    ];
    await open();
    expect(screen.getByTestId("history-date").textContent).toBe(
      "11月16日（月）",
    );
    expect(screen.getByTestId("history-total").textContent).toBe("49分2回");
    const [first, second] = screen.getAllByTestId("history-item");
    if (!first || !second) throw new Error("no rows");
    expect(within(first).getByTestId("history-item-title").textContent).toBe(
      "（タイトルなし）",
    );
    expect(within(first).getByTestId("history-item-early")).toBeTruthy();
    expect(within(second).getByTestId("history-item-time").textContent).toBe(
      "09:00 – 09:39",
    );
    expect(within(second).getByTestId("history-item-length").textContent).toBe(
      "39分",
    );
    expect(
      within(second).getByTestId("history-item-category").textContent,
    ).toBe("開発");
    expect(within(second).getByTestId("history-item-notes").textContent).toBe(
      "方針を決めた\n残りは明日",
    );
    expect(screen.getByTestId("history-next")).toHaveProperty("disabled", true);
    fireEvent.click(screen.getByTestId("history-prev"));
    expect(screen.getByTestId("history-date").textContent).toBe(
      "11月15日（日）",
    );
    expect(screen.getAllByTestId("history-item")).toHaveLength(1);
    expect(screen.getByTestId("history-total").textContent).toBe("30分1回");
    fireEvent.click(screen.getByTestId("history-prev"));
    expect(screen.getByTestId("history-empty").textContent).toBe(
      "この日の記録はありません",
    );
    fireEvent.click(screen.getByTestId("history-next"));
    fireEvent.click(screen.getByTestId("history-next"));
    expect(screen.getByTestId("history-date").textContent).toBe(
      "11月16日（月）",
    );
    expect(screen.getByTestId("history-next")).toHaveProperty("disabled", true);
  });
  it("adds a record ending now on today, and after the last record on a past day", async () => {
    mock.records = [morning, yesterday];
    await open();
    fireEvent.click(screen.getByTestId("history-add"));
    expect(screen.getByTestId("record-start")).toHaveProperty("value", "14:35");
    expect(screen.getByTestId("record-end")).toHaveProperty("value", "15:00");
    change("record-title", "手で足した");
    change("record-category", "調査");
    change("record-notes", "メモ");
    change("record-start", "14:00");
    change("record-end", "14:40");
    fireEvent.click(screen.getByTestId("record-save"));
    await waitFor(() => expect(screen.queryByTestId("record-edit")).toBeNull());
    expect(saved("put_record")[0]?.[1]).toEqual({
      record: {
        id: expect.any(String),
        kind: "focus",
        title: "手で足した",
        category: "調査",
        notes: "メモ",
        started_at: localIso8601(at(16, 14)),
        ended_at: localIso8601(at(16, 14, 40)),
        planned_sec: 2400,
        actual_sec: 2400,
        outcome: "completed",
      },
    });
    fireEvent.click(screen.getByTestId("history-prev"));
    fireEvent.click(screen.getByTestId("history-add"));
    // 昨日の最後の記録は翌日 0:20 に終わるので、続きには置けず 9 時からにする。
    expect(screen.getByTestId("record-start")).toHaveProperty("value", "09:00");
    expect(screen.getByTestId("record-end")).toHaveProperty("value", "09:25");
  });
  it("keeps the seconds of untouched times when only the title is edited", async () => {
    mock.records = [morning];
    await open();
    fireEvent.click(screen.getByTestId("history-edit"));
    expect(screen.getByTestId("record-category")).toHaveProperty(
      "value",
      "開発",
    );
    change("record-title", "朝の設計（改）");
    fireEvent.click(screen.getByTestId("record-save"));
    await waitFor(() => expect(screen.queryByTestId("record-edit")).toBeNull());
    expect(saved("put_record")[0]?.[1]).toEqual({
      record: { ...morning, title: "朝の設計（改）" },
    });
  });
  it("recomputes the time on edit and treats an end before the start as the next day", async () => {
    mock.records = [yesterday];
    await open();
    fireEvent.click(screen.getByTestId("history-prev"));
    fireEvent.click(screen.getByTestId("history-edit"));
    expect(screen.getByTestId("record-length").textContent).toBe("翌日30分");
    // 開始だけを終了より前の時刻に変えたら、終了を元の翌日のまま残さず同じ日に戻す。
    change("record-start", "00:10");
    expect(screen.getByTestId("record-length").textContent).toBe("10分");
    change("record-start", "23:50");
    change("record-end", "00:05");
    fireEvent.click(screen.getByTestId("record-save"));
    await waitFor(() => expect(saved("put_record")).toHaveLength(1));
    expect(saved("put_record")[0]?.[1]).toEqual({
      record: {
        ...yesterday,
        ended_at: localIso8601(at(16, 0, 5)),
        actual_sec: 900,
        outcome: "ended_early",
      },
    });
  });
  it("shows a validation error and blocks saving while invalid", async () => {
    mock.records = [morning];
    await open();
    fireEvent.click(screen.getByTestId("history-edit"));
    expect(screen.queryByTestId("record-error")).toBeNull();
    change("record-end", "09:00");
    expect(screen.getByTestId("record-error").textContent).toBe(
      "終了は開始より後にしてください。",
    );
    expect(screen.getByTestId("record-save")).toHaveProperty("disabled", true);
    change("record-end", "16:00");
    expect(screen.getByTestId("record-error").textContent).toBe(
      "終了は今より前にしてください。",
    );
    change("record-end", "");
    expect(screen.getByTestId("record-error").textContent).toBe(
      "開始と終了の時刻を入れてください。",
    );
    fireEvent.submit(screen.getByTestId("record-edit"));
    expect(saved("put_record")).toHaveLength(0);
    fireEvent.click(screen.getByTestId("record-cancel"));
    expect(screen.queryByTestId("record-edit")).toBeNull();
  });
  it("deletes only after confirming", async () => {
    mock.records = [morning];
    await open();
    fireEvent.click(screen.getByTestId("history-delete"));
    fireEvent.click(screen.getByTestId("delete-record-cancel"));
    expect(saved("delete_record")).toHaveLength(0);
    fireEvent.click(screen.getByTestId("history-delete"));
    expect(screen.getByTestId("delete-record-confirm").textContent).toContain(
      "朝の設計",
    );
    fireEvent.click(screen.getByTestId("delete-record-confirm-ok"));
    expect(saved("delete_record")[0]?.[1]).toEqual({ id: morning.id });
    expect(screen.queryByTestId("delete-record-confirm")).toBeNull();
  });
  it("keeps the form open with the reason when saving fails, and reports a failed delete", async () => {
    mock.records = [morning];
    mock.fail = "書き込めません";
    await open();
    fireEvent.click(screen.getByTestId("history-edit"));
    fireEvent.click(screen.getByTestId("record-save"));
    expect((await screen.findByTestId("record-error")).textContent).toBe(
      "保存に失敗しました: 書き込めません",
    );
    expect(screen.getByTestId("record-save")).toHaveProperty("disabled", false);
    fireEvent.click(screen.getByTestId("record-cancel"));
    fireEvent.click(screen.getByTestId("history-delete"));
    fireEvent.click(screen.getByTestId("delete-record-confirm-ok"));
    expect((await screen.findByTestId("history-error")).textContent).toBe(
      "削除に失敗しました: 書き込めません",
    );
  });
  it("closes only the top layer on Esc", async () => {
    mock.records = [morning];
    const onClose = vi.fn();
    await open(onClose);
    fireEvent.click(screen.getByTestId("history-edit"));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("record-edit")).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  it("shows a listing error", async () => {
    mock.invoke.mockImplementationOnce(() =>
      Promise.reject("sessions.jsonl を読めません"),
    );
    render(<History now={now} categories={[]} onClose={() => {}} />);
    expect((await screen.findByTestId("history-error")).textContent).toBe(
      "sessions.jsonl を読めません",
    );
  });
});
