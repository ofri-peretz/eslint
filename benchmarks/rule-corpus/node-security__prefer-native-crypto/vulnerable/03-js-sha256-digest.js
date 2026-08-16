/**
 * VULNERABLE - a pure-JS SHA-256 in a request-signing middleware. createHash
 * does the same thing in C, and this package has to be patched by hand when the
 * next issue lands (CWE-1104).
 */
import sha256 from 'js-sha256';

export function signRequest(req, secret) {
  req.headers['x-signature'] = sha256(secret + req.rawBody);
  return req;
}
