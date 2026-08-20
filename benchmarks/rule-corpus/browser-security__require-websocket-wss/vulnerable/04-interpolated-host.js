/**
 * VULNERABLE - The host comes from config and the scheme is hardcoded, so the
 * channel is cleartext whatever the host resolves to.
 */
export function connect(host) {
  return new WebSocket(`ws://${host}/socket`);
}
