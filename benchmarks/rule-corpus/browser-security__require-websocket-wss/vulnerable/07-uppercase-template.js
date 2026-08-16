/**
 * VULNERABLE - ADVERSARIAL. The template spelling of the same evasion.
 */
export function joinLegacy(room) {
  return new WebSocket(`WS://legacy.acme-corp.io/rooms/${room}`);
}
