/**
 * VULNERABLE - `document.referrer` is chosen by whoever linked to this page.
 * Interpolated into a fragment it still reaches every consumer that parses the
 * hash as its own key/value pairs.
 */
export function analyticsUrl() {
  return 'https://metrics.example.com/collect#from=' + document.referrer;
}
