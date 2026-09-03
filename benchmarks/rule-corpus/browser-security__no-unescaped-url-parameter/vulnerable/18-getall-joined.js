/**
 * VULNERABLE (wave 2) - `getAll(...).join(',')`. Joining an array of inbound
 * strings produces inbound text; a passthrough list built for single strings
 * loses the whole value here.
 */
export function tagUrl() {
  const tags = new URLSearchParams(location.search).getAll('tag');
  return fetch(`https://api.example.com/v1/items?tags=${tags.join(',')}`);
}
