/**
 * SAFE - `Number.prototype.toFixed` returns digits and at most one dot; there
 * is no URL metacharacter it can produce. Reported by the old rule purely
 * because the printed source contained the letters `input`.
 */
export function priceUrl(input) {
  return `https://api.example.com/v1/items?price=${input.toFixed(2)}`;
}
