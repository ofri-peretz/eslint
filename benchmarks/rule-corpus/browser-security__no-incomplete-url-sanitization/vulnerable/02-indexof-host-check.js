/**
 * VULNERABLE - The same test spelled with `indexOf`. Different method, same
 * bypass, and a rule that only knows one spelling covers half the corpus.
 */
export function allowed(targetUrl) {
  return targetUrl.indexOf('partner.example.com') !== -1;
}
