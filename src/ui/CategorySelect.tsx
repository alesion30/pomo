export function CategorySelect({
  testId,
  categories,
  hue,
  value,
  onChange,
}: {
  testId: string;
  categories: string[];
  hue?: number;
  value: string;
  onChange(value: string): void;
}) {
  // 一覧から消したカテゴリでも、進行中の集中に付いていればそのまま見せて記録にも使う。
  const options =
    value && !categories.includes(value) ? [...categories, value] : categories;
  return (
    <span className="category-pick" data-hue={hue}>
      <select
        className="category-field"
        data-testid={testId}
        aria-label="カテゴリ"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">なし</option>
        {options.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
    </span>
  );
}
