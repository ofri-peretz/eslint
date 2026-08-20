/**
 * VULNERABLE (wave 2) - The value is aliased once more before use. A binding
 * chain of length two is ordinary code, and a resolver that only takes one hop
 * stops one line short.
 */
export function forward() {
  const raw = new URLSearchParams(location.search).get('next');
  const target = raw;
  return fetch(`https://api.example.com/v1/track?to=${target}`);
}
