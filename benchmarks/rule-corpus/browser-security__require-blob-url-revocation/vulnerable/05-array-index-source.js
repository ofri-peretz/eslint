/**
 * VULNERABLE - The Blob is reached through an array index; the handle is still
 * never released.
 */
export function showFirstAttachment(files) {
  const thumbnailUrl = URL.createObjectURL(files[0]);
  document.querySelector('#thumb').setAttribute('src', thumbnailUrl);
}
