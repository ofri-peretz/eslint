/**
 * SAFE (wave 2) - The parameter's type is a closed set of two literals. The
 * caller is outside the module, but the set of values it may pass is not
 * unknowable — it is written down.
 */
export function sortedUrl(direction: 'asc' | 'desc'): string {
  return `https://api.example.com/v1/items?sort=${direction}`;
}
