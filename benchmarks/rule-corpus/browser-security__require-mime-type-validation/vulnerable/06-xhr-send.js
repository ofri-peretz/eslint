/**
 * VULNERABLE - The XHR spelling of the same upload, with a progress handler.
 */
export function uploadWithProgress(input, onProgress) {
  const request = new XMLHttpRequest();
  request.upload.addEventListener('progress', onProgress);
  request.open('POST', '/api/upload');
  request.send(input.files[0]);
}
