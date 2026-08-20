/**
 * SAFE - The scheme appears inside a guard being evaluated, not a destination.
 */
export function assertSecure(url) {
  if (url.startsWith('ws://')) {
    throw new Error('cleartext socket rejected');
  }
  return url;
}
