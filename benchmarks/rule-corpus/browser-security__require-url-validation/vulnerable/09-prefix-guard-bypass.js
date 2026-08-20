/**
 * VULNERABLE - ADVERSARIAL. `https://app.acme-corp.io.evil.test/` starts with
 * the trusted prefix, so the guard authorizes exactly what it meant to block.
 */
const next = new URLSearchParams(location.search).get('next');
if (next.startsWith('https://app.acme-corp.io')) {
  window.open(next);
}
