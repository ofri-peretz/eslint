/**
 * SAFE - The correct remediation: parse the frame as data and validate its shape.
 */
const ws = new WebSocket('wss://quotes.example.test/stream');

ws.onmessage = (event) => {
  const frame = JSON.parse(event.data);
  if (typeof frame.symbol === 'string' && typeof frame.price === 'number') {
    renderQuote(frame);
  }
};
