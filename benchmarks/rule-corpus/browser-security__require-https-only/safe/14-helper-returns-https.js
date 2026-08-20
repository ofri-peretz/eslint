/**
 * SAFE - The URL passes through a helper, which is the shape that defeats a
 * naive "literal inside a call" match. The helper returns HTTPS.
 */
function api(path) {
  return `https://api.acme-corp.io/v1/${path}`;
}

export function loadUsers() {
  return fetch(api('users'));
}
