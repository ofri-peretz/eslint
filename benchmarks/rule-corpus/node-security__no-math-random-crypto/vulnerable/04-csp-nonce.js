/**
 * VULNERABLE - Content-Security-Policy nonce drawn from Math.random().
 *
 * A CSP nonce is a capability: any script tag carrying it executes. If the
 * attacker can predict the nonce for the response they are about to inject
 * into, the entire script-src allowlist is bypassed and the CSP is decorative.
 */
'use strict';

function cspNonceMiddleware(req, res, next) {
  const nonce = Math.random().toString(36).slice(2, 14);

  res.locals.cspNonce = nonce;
  res.setHeader(
    'Content-Security-Policy',
    `default-src 'self'; script-src 'self' 'nonce-${nonce}'`,
  );

  next();
}

module.exports = { cspNonceMiddleware };
