/**
 * VULNERABLE - The SSR-safe spelling. Optional chaining does not change the sink.
 */
export function saveIdToken(token) {
  window.localStorage?.setItem('id_token', token);
}
