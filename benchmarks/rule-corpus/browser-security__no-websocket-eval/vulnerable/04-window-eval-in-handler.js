/**
 * VULNERABLE - `window.eval` inside the handler. Same evaluator, spelled out.
 * This was reported by NEITHER rule in the pair: the generic rule yielded it as
 * WebSocket-owned and this rule did not model the member callee.
 */
const ws = new WebSocket('wss://feed.example.test');

ws.onmessage = (event) => {
  window.eval(event.data);
};
