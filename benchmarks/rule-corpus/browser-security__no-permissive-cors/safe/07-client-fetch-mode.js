/** SAFE - a browser making a cross-origin REQUEST. `mode: 'cors'` asks the
 *  browser to perform a CORS check; it grants nothing. */
export async function loadPublicFeed() {
  return fetch('https://api.partner.example/feed', {
    mode: 'cors',
    credentials: 'omit',
  });
}
