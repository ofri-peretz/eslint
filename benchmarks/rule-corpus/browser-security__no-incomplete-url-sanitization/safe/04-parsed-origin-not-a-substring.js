/**
 * SAFE - `new URL(location.href).origin` is the browser-normalised current
 * origin, compared with `===`. Neither half of the rule applies: no substring
 * test, no scheme denylist.
 */
export function sameOrigin(candidate) {
  const { origin } = new URL(location.href);
  return candidate === origin;
}
