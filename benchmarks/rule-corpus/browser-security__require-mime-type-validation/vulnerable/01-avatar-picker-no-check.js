/**
 * VULNERABLE - The plain file picker. The `accept` attribute on the input is a
 * UI hint the browser does not enforce, and nothing here looks at the type.
 */
const input = document.querySelector('#avatar');

input.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  const body = new FormData();
  body.append('avatar', file);
  await fetch('/api/avatar', { method: 'POST', body });
});
