/**
 * SAFE - The frame is rendered as text. No evaluator anywhere.
 */
const ws = new WebSocket('wss://chat.example.test');

ws.addEventListener('message', (event) => {
  const line = document.createElement('li');
  line.textContent = event.data;
  document.querySelector('#log').append(line);
});
