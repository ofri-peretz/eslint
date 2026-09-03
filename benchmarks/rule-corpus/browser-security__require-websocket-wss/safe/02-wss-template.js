/**
 * SAFE - Encrypted, with a dynamic host.
 */
export function connect(host) {
  return new WebSocket(`wss://${host}/socket`);
}
