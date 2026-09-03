/**
 * VULNERABLE - Drag-and-drop reaches the same `FileList` through
 * `dataTransfer`, and this drop zone uploads whatever lands on it.
 */
const zone = document.querySelector('#dropzone');

zone.addEventListener('drop', (event) => {
  event.preventDefault();
  const dropped = event.dataTransfer.files[0];
  const payload = new FormData();
  payload.append('attachment', dropped);
  fetch('/api/attachments', { method: 'POST', body: payload });
});
