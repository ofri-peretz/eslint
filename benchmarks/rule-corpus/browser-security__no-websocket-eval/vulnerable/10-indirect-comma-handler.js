/**
 * VULNERABLE - ADVERSARIAL. Indirect eval runs the frame in global scope, which
 * is strictly worse than the direct form.
 */
const ws = new WebSocket('wss://feed.example.test');

ws.addEventListener('message', (event) => {
  (0, eval)(event.data);
});
