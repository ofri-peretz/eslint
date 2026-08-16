/**
 * VULNERABLE - Bracket notation on the global object, inside the handler.
 */
const ws = new WebSocket('wss://feed.example.test');

ws.addEventListener('message', (event) => {
  globalThis['eval'](event.data);
});
