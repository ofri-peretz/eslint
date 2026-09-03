/**
 * SAFE - ADVERSARIAL. XMLHttpRequest is not an XML parser. It has carried the
 * letters XML since 1999 for historical reasons and is used here, as almost
 * everywhere, to POST JSON with upload progress - the one thing `fetch` still
 * cannot do. Nothing in this file parses XML or evaluates an entity.
 */
export function uploadAvatar(file, onProgress) {
  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/avatar');
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.upload.addEventListener('progress', (event) => onProgress(event.loaded / event.total));
  xhr.send(JSON.stringify({ name: file.name, size: file.size }));
  return xhr;
}
