/**
 * VULNERABLE - The URL comes out of a `URLSearchParams` over `location.search`.
 * Before the container fix this was invisible: the taint branch saw an opaque
 * call and the value was left unexamined.
 */
export function guard() {
  const next = new URLSearchParams(location.search).get('next');
  if (next.includes('app.example.com')) {
    location.assign(next);
  }
}
