/**
 * SAFE - The scheme appears inside a guard being evaluated, not a destination.
 */
export function assertSecureSocket(url) {
  if (url.startsWith('ws://')) {
    throw new Error('Refusing to open a cleartext WebSocket');
  }
  return new WebSocket(url);
}
