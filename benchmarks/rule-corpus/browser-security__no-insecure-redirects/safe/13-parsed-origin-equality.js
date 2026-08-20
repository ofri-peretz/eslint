/**
 * SAFE - The WHATWG remediation: parse the target and compare its ORIGIN.
 * `https://app.acme-corp.io.evil.test` parses to a different origin and fails,
 * which is exactly what a `startsWith` prefix check cannot do.
 */
const raw = new URLSearchParams(location.search).get('next');
const parsed = new URL(raw, window.location.origin);
if (parsed.origin === 'https://app.acme-corp.io') {
  window.location.assign(raw);
}
