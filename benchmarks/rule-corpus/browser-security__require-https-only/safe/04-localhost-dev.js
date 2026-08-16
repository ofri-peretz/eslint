/**
 * SAFE - A dev server never leaves the machine, so there is no cleartext
 * transmission to intercept. Reporting it makes the rule unusable in dev.
 */
export function devPing() {
  return fetch('http://localhost:3000/api/health');
}
