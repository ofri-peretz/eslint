/**
 * VULNERABLE - `event.target.value` inside a function that is genuinely
 * installed as a listener. The handler position is proven from the
 * `addEventListener` call, never from an `on`-prefixed name.
 */
const box = document.querySelector('#filter');

box.addEventListener('input', (event) => {
  fetch(`https://api.example.com/v1/suggest?prefix=${event.target.value}`);
});
