/**
 * SAFE FOR THIS RULE - The constructor argument belongs to
 * `require-websocket-wss`, which reports it WITH an autofix. Two rules on one
 * constructor was the duplicate this partition removed.
 */
export const chat = new WebSocket('ws://chat.acme-corp.io/rooms/general');
