/**
 * VULNERABLE - ADVERSARIAL. The guard looks like validation and is not:
 * `https://app.acme-corp.io.evil.test/` starts with the trusted prefix.
 * The old rule suppressed on the mere presence of `startsWith('…')`.
 */
const next = new URLSearchParams(location.search).get('next');
if (next.startsWith('https://app.acme-corp.io')) {
  window.location.href = next;
}
