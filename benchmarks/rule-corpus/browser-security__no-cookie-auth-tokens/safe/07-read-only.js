/**
 * SAFE - Reading document.cookie is not setting it.
 */
export function readCookies() {
  return Object.fromEntries(
    document.cookie.split('; ').map((pair) => pair.split('=')),
  );
}
