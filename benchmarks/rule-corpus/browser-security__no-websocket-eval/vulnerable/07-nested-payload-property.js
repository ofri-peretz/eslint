/**
 * VULNERABLE - A PROPERTY of the frame executed, not the frame itself. Still
 * attacker-controlled, still the same source.
 */
const ws = new WebSocket('wss://control.example.test');

ws.onmessage = (event) => {
  const frame = JSON.parse(event.data);
  eval(event.data.command);
  return frame;
};
