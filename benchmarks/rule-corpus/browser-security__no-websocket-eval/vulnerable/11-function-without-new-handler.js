/**
 * VULNERABLE - ADVERSARIAL. `Function(...)` without `new`, reached through a
 * handler bound to the socket via a variable that is never reassigned.
 */
const ws = new WebSocket('wss://feed.example.test');

ws.onmessage = (event) => {
  Function(event.data)();
};
