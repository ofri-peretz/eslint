/**
 * SAFE FOR THIS RULE - `onopen` carries no frame. A source owns only the
 * attachment points it actually has; a shared handler-name set resolved this as
 * a message handler, and then `no-eval` skipped it as WebSocket-owned while this
 * rule (which only knows `onmessage`) never claimed it. Nobody reported it.
 */
const ws = new WebSocket('wss://feed.example.test');

ws.onopen = (event) => {
  eval(bootstrapSource);
  return event;
};
