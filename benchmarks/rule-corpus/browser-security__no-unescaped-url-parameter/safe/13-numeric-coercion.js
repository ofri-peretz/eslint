/**
 * SAFE - `Number.parseInt` over inbound text. The value that reaches the URL is
 * the parser's output, and it can only ever be digits or `NaN`.
 */
export function pageUrl() {
  const page = Number.parseInt(new URLSearchParams(location.search).get('page'), 10);
  return `https://api.example.com/v1/items?page=${page}`;
}
