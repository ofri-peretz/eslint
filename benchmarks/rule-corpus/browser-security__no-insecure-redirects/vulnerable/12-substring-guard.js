/**
 * VULNERABLE - ADVERSARIAL. A containment check is not an origin check:
 * `https://evil.test/?trust=app.acme-corp.io` contains the trusted host.
 */
const target = document.referrer;
if (target.includes('app.acme-corp.io')) {
  window.location.replace(target);
}
