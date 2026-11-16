/** 選べる色。値は config.json に書く名前で、並びは data-hue の番号と CSS の色に対応する。 */
export const PALETTE = [
  { name: "sky", label: "青" },
  { name: "amber", label: "黄" },
  { name: "violet", label: "紫" },
  { name: "rose", label: "桃" },
  { name: "leaf", label: "緑" },
  { name: "tomato", label: "赤" },
] as const;

export type Colors = Record<string, string>;

/**
 * カテゴリの色の番号。設定で選んだ色を優先する。選んでいなければ、一覧の並び順で色の数までは重ならないようにする。
 * 一覧から消したカテゴリは、名前から決めて同じ色のままにする。
 */
export function hueOf(
  category: string | null,
  categories: string[],
  colors: Colors,
) {
  if (!category) return undefined;
  const chosen = PALETTE.findIndex((c) => c.name === colors[category]);
  if (chosen >= 0) return chosen;
  const index = categories.indexOf(category);
  if (index >= 0) return index % PALETTE.length;
  let hash = 0;
  for (const char of category)
    hash = (hash * 31 + (char.codePointAt(0) ?? 0)) % 9973;
  return hash % PALETTE.length;
}
