/**
 * SAFE - The sink name appears only inside a string literal.
 */
const ws = new WebSocket('wss://feed.example.test');

ws.onmessage = (event) => {
  if (event.data.startsWith('eval(')) {
    console.warn('server sent an executable frame; refusing', event.data);
    return;
  }
  applyFrame(JSON.parse(event.data));
};
