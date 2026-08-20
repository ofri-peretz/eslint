/**
 * VULNERABLE - A reconnect wrapper. The constructor is inside a helper, which
 * is where realtime code actually puts it.
 */
export function openSocket() {
  let socket = new WebSocket('ws://events.acme-corp.io/stream');
  socket.onclose = () => {
    socket = new WebSocket('ws://events.acme-corp.io/stream');
  };
  return socket;
}
