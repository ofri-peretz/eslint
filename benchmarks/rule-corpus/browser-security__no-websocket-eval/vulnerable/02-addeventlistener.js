/**
 * VULNERABLE - The `addEventListener` attachment shape, same defect.
 */
const socket = new WebSocket('wss://chat.example.test');

socket.addEventListener('message', (event) => {
  eval(event.data);
});
