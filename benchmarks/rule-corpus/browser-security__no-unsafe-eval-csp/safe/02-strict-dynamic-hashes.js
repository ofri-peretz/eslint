/** SAFE - the other correct remediation: 'strict-dynamic' plus hashes. No
 *  eval, no inline, no wildcard. */
export const csp = [
  "default-src 'self'",
  "script-src 'strict-dynamic' 'sha256-AbCdEf0123456789+/=' 'unsafe-inline' https:",
  "object-src 'none'",
  "base-uri 'none'",
].join('; ');
