/**
 * VULNERABLE - the `Buffer()` FACTORY call, without `new`. Identical semantics
 * to the constructor and deprecated by the same DEP0005; a codebase that only
 * grepped for `new Buffer` keeps shipping this spelling.
 */
export function decodeSessionCookie(cookieValue) {
  // `Buffer(str, enc)` — DEP0005, runtime deprecation warning since Node 10.
  const raw = Buffer(cookieValue, 'base64');
  return JSON.parse(raw.toString('utf8'));
}
