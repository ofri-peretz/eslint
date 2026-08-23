/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Two non-security SHA-1s, from the hand-verification run of 2026-08-22.
 *
 * 1. A CERTIFICATE THUMBPRINT — ahaenggli/AzureAD-LDAP-wrapper
 *    `src/graph.auth.js:43`:
 *
 *      const thumbprint = crypto.createHash('sha1').update(certBuffer)
 *        .digest('hex').toUpperCase()
 *
 *    Azure AD / MSAL client-certificate auth sends the SHA-1 thumbprint as the
 *    JWS `x5t` header (RFC 7515 §4.1.7). The algorithm is the protocol's
 *    choice, not the maintainer's, and SHA-256 there does not harden anything
 *    — it fails to authenticate. What made it a CRITICAL CWE-327 was the input
 *    name `certBuffer` matching the security word `cert`.
 *
 * 2. A LOG-CORRELATION TICKET — shardeum/json-rpc-server `src/api.ts:1494`:
 *
 *      eth_signTransaction: async function (args, callback) {
 *        const ticket = crypto.createHash('sha1')
 *          .update(api_name + Math.random() + Date.now()).digest('hex')
 *        logEventEmitter.emit('fn_start', ticket, api_name, …)
 *
 *    The digest is stored as `ticket` and emitted to a log. The only thing that
 *    made it a finding was the word `sign` inside the enclosing RPC method's
 *    name — the weakest of the three evidence sources, reached even though the
 *    strongest one (where the digest is stored) had already answered.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import parser from '@typescript-eslint/parser';
import { noWeakHashAlgorithm } from './index';

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run(
  'no-weak-hash-algorithm — a thumbprint is not a security hash',
  noWeakHashAlgorithm,
  {
    valid: [
      // 1. The thumbprint, stored under its own name…
      `const thumbprint = crypto.createHash('sha1').update(certBuffer).digest('hex').toUpperCase();`,
      // …and returned straight out of the function that computes it, where the
      // only name available is the function's.
      `function calculateThumbprint(certificate) { return crypto.createHash('sha1').update(certBuffer).digest('hex'); }`,
      // The JWS header spells it `x5t`.
      `const x5t = crypto.createHash('sha1').update(certDer).digest('base64');`,

      // 2. The log ticket, with the enclosing method named after signing.
      `const api = { eth_signTransaction: async function (args, callback) { const ticket = crypto.createHash('sha1').update(api_name + Date.now()).digest('hex'); emit(ticket); } };`,
    ],
    invalid: [
      // Positive controls. `fingerprint` is deliberately NOT exempt — a PGP key
      // fingerprint, a TLS/JA3 fingerprint and a device fingerprint are all
      // spelled that way and none is protocol-pinned to SHA-1.
      {
        code: `const certFingerprint = createHash('sha1').update(pem).digest('hex');`,
        errors: 1,
      },
      // The strongest evidence still reports: the digest IS the signature.
      {
        code: `const signature = crypto.createHash('sha1').update(certBuffer).digest('hex');`,
        errors: 1,
      },
      // The enclosing-function name is still read when the digest is stored
      // nowhere — that arm is narrowed, not removed.
      {
        code: `function signRequest(body) { return md5(body); }`,
        errors: 1,
      },
    ],
  },
);
