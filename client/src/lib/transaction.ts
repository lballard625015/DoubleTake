export function transactionCategoryName(category?: string | string[]): string {
  const value = Array.isArray(category) ? category[0] : category
  return value?.trim().replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Uncategorized'
}
