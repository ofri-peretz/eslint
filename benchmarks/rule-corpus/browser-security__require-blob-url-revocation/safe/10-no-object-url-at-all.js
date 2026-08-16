/**
 * SAFE - A file-upload handler that never mints a handle. `FileReader` and
 * `fetch` carry the bytes; there is nothing to release.
 */
export async function upload(file) {
  const body = new FormData();
  body.append('file', file);
  const response = await fetch('/api/upload', { method: 'POST', body });
  return response.json();
}
