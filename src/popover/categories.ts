export function filterCategories(
  categories: string[],
  query: string,
): string[] {
  if (!query) return [];
  return categories.filter(
    (category) => category.startsWith(query) && category !== query,
  );
}
