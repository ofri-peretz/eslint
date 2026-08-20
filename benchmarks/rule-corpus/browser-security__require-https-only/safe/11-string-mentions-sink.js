/**
 * SAFE - The scheme appears inside a guard being EVALUATED, not a destination
 * being called. Reporting it flags the security check as the vulnerability.
 */
export function assertSecure(url) {
  if (url.startsWith('http://')) {
    throw new Error('Refusing to fetch over http://');
  }
  return fetch(url);
}
