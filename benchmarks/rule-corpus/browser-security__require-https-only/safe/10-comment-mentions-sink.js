/**
 * SAFE - The sink and the scheme appear only in a comment.
 */
// Do not fetch('http://...') here — the gateway rejects cleartext upstreams.
export function loadConfig() {
  return fetch('/api/config');
}
