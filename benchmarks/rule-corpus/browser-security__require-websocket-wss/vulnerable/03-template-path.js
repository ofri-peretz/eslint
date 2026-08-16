/**
 * VULNERABLE - The room is dynamic, the scheme is not.
 */
export function joinRoom(room) {
  return new WebSocket(`ws://chat.acme-corp.io/rooms/${room}`);
}
