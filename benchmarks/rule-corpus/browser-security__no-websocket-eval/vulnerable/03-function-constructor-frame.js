/**
 * VULNERABLE - The frame compiled with the Function constructor instead of eval.
 */
const ws = new WebSocket('wss://rules.example.test');

ws.onmessage = (event) => {
  const apply = new Function('state', event.data);
  apply(window.__STATE__);
};
