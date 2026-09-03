/**
 * SAFE FOR THIS RULE - ADVERSARIAL. The inner callback's parameter SHARES the
 * handler's name and holds something else entirely. Matching `event.data` by
 * name attributes a compiled template to the socket; matching the binding does
 * not.
 */
const ws = new WebSocket('wss://feed.example.test');
const TEMPLATES = [{ id: 'row', body: 'return 1' }];

ws.onmessage = (event) => {
  const frame = JSON.parse(event.data);
  TEMPLATES.forEach((event) => {
    registry[event.id] = new Function(event.body);
  });
  return frame;
};
