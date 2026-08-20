/**
 * SAFE FOR THIS RULE - Same hand-off, template spelling.
 */
export function joinRoom(room) {
  return new WebSocket(`ws://chat.acme-corp.io/rooms/${room}`);
}
