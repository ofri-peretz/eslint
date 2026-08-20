/**
 * VULNERABLE - The handle is written straight to the sink, never through a
 * variable. This is the single most common spelling of the API.
 */
const input = document.querySelector('#avatar');

input.addEventListener('change', (event) => {
  const preview = document.querySelector('#preview');
  preview.src = URL.createObjectURL(event.target.files[0]);
});
