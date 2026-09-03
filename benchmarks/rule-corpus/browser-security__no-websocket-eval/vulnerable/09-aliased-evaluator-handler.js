/**
 * VULNERABLE - ADVERSARIAL. The evaluator aliased at module scope, then called
 * on the frame. Nothing at the call site is spelled `eval`.
 */
const run = eval;
const ws = new WebSocket('wss://feed.example.test');

ws.onmessage = (event) => {
  run(event.data);
};
