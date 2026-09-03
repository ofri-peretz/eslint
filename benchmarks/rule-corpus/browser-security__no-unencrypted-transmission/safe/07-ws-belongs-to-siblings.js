/**
 * SAFE FOR THIS RULE - `ws://` left this rule's defaults too;
 * `require-websocket-wss` reports the constructor WITH an autofix.
 */
export const chat = new WebSocket('ws://chat.acme-corp.io/rooms/general');
