/** SAFE - the browser's own fetch, with the token attached by hand. A client
 *  making a request is not a server exposing one. */
export async function saveProfile(profile, token) {
  return fetch('/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
    body: JSON.stringify(profile),
  });
}
