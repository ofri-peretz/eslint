/**
 * VULNERABLE - The legacy evaluator in a compatibility branch of the handler.
 */
const ws = new WebSocket('wss://legacy.example.test');

ws.onmessage = (event) => {
  if (typeof execScript === 'function') {
    execScript(event.data);
  } else {
    eval(event.data);
  }
};
