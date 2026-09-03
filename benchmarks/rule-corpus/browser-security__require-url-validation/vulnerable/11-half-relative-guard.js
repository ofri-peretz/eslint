/**
 * VULNERABLE - ADVERSARIAL. Only HALF the relative-path guard. `//evil.test/x`
 * starts with `/` and every browser reads it as a protocol-relative absolute
 * URL, so this check authorizes an arbitrary origin.
 */
const next = new URLSearchParams(location.search).get('next');
if (next.startsWith('/')) {
  window.open(next);
}
