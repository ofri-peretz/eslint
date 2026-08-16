/**
 * SAFE FOR THIS RULE - The cleartext URL is a HEADER VALUE, not the request
 * target. The request itself is same-origin. A rule that matched "a URL
 * somewhere near a fetch" would report the wrong line and make `no-http-urls`
 * defer on a shape nobody then covers.
 */
export function report() {
  return fetch('/api/report', {
    headers: { referer: 'http://legacy.acme-corp.io/dashboard' },
  });
}
