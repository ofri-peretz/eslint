/**
 * VULNERABLE - Every message, in both directions, in the clear. A socket is
 * worse than a single request: it is a persistent cleartext channel.
 */
export const chat = new WebSocket('ws://chat.acme-corp.io/rooms/general');
