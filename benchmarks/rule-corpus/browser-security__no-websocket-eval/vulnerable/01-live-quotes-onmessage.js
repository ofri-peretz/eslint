/**
 * VULNERABLE - A live-quotes feed whose frames are executed. A compromised
 * server or a MITM on the socket owns the page.
 */
const ws = new WebSocket('wss://quotes.example.test/stream');

ws.onmessage = (event) => {
  eval(event.data);
};
