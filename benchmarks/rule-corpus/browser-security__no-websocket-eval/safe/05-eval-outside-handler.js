/**
 * SAFE FOR THIS RULE - The socket is open, but the evaluator runs on a value
 * that never came from it. Owned by `no-eval`.
 */
const ws = new WebSocket('wss://feed.example.test');

ws.onmessage = (event) => {
  renderFrame(event.data);
};

export function runBootstrap(source) {
  eval(source);
}
