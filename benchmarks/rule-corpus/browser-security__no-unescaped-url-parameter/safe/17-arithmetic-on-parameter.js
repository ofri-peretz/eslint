/**
 * SAFE (wave 2) - `page + 1` is arithmetic, not concatenation. A taint walk
 * that follows every `+` operand reports the successor of a number as an
 * unescaped URL parameter.
 */
export function nextPageUrl(page) {
  return `https://api.example.com/v1/items?page=${page + 1}`;
}
