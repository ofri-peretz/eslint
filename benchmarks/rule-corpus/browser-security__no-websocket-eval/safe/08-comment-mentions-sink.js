/**
 * SAFE - The sink name appears only in a comment.
 */
const ws = new WebSocket('wss://feed.example.test');

ws.onmessage = (event) => {
  // Never eval(event.data) — frames are data and must be parsed as data.
  applyFrame(JSON.parse(event.data));
};
