/**
 * VULNERABLE - The URL is assembled by concatenation AT the call site, so the
 * scheme is written down here. One URL, one call, still cleartext.
 */
export function getResource(name) {
  return fetch('http://api.acme-corp.io/v1/' + name);
}
