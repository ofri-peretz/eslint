/**
 * VULNERABLE - A cleartext request that also ships the session cookie, so the
 * credential itself is on the wire, not just the response body.
 */
export function whoami() {
  return fetch('http://api.acme-corp.io/v1/me', { credentials: 'include' });
}
