import { describe, expect, it } from "vitest";
import { filterCategories } from "./categories";

describe("filterCategories", () => {
  it("keeps recency order and narrows by prefix", () => {
    expect(
      filterCategories(["設計", "実装", "設計レビュー", "調査"], "設"),
    ).toEqual(["設計", "設計レビュー"]);
    expect(filterCategories(["設計", "設計レビュー"], "設計")).toEqual([
      "設計レビュー",
    ]);
  });
});
