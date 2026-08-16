/**
 * SAFE - The constructor and the scheme appear only in a comment.
 */
// Do not use new WebSocket('ws://...') here; the gateway requires wss://.
export const chat = new WebSocket('wss://chat.acme-corp.io/rooms/general');
