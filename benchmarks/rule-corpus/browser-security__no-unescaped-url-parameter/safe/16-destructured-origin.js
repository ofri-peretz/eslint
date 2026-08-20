/**
 * SAFE (wave 2) - `const { origin } = new URL(location.href)`. The container IS
 * inbound text, but `origin` is the browser-normalised current origin — the one
 * `URL` property that carries nothing an attacker chose. A destructure that
 * resolves to the initialiser and stops there cannot tell the two apart.
 */
export function callbackUrl() {
  const { origin } = new URL(location.href);
  return `https://auth.example.com/v1/authorize?issuer=${origin}`;
}
