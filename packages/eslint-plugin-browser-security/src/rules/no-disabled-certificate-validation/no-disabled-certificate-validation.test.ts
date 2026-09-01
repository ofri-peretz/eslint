/**
 * @fileoverview Tests for no-disabled-certificate-validation
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noDisabledCertificateValidation } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-disabled-certificate-validation', noDisabledCertificateValidation, {
  valid: [
    // Proper SSL configuration
    { name: 'certificate validation left on', code: "const options = { rejectUnauthorized: true }" },
    { code: "const config = { strictSSL: true }" },
    { code: "const settings = { verify: true }" },
    // Non-SSL code
    { code: "const x = 1" },

    // ── checkServerIdentity that can still report a mismatch ──────────────
    // Corpus lock: benchmarks/corpus/CWE-295/safe/
    //              tls-checkserveridentity-validates.js
    {
      code: `
        tls.connect({
          host,
          port: 443,
          checkServerIdentity: (hostname, cert) => {
            const err = tls.checkServerIdentity(hostname, cert);
            if (err) return err;
            if (hostname !== 'api.internal.example') {
              return new Error('unexpected host: ' + hostname);
            }
            return undefined;
          },
        });
      `,
    },
    // Corpus lock: benchmarks/corpus/CWE-295/safe/tls-default-verification.js
    {
      code: "https.request({ host, path: '/secret', method: 'GET' }, onRes)",
    },
    // Delegation as a single expression.
    {
      code: "tls.connect({ checkServerIdentity: (h, c) => tls.checkServerIdentity(h, c) })",
    },
    // Throwing is reporting.
    {
      code: "tls.connect({ checkServerIdentity: function (h, c) { throw new Error('nope'); } })",
    },
    // A named reference is opaque — guessing would be reporting without evidence.
    { code: "tls.connect({ checkServerIdentity: verifyPeer })" },
    // Not a `checkServerIdentity` property at all.
    { code: "tls.connect({ onError: () => undefined })" },
    { code: "tls.connect({ [dynamicKey]: () => undefined })" },
    // A `return` outside any checkServerIdentity must not be attributed to one.
    { code: "function f() { return new Error('x'); }" },
    { code: "function f() { throw new Error('x'); }" },
  ],

  invalid: [
    // Disabled certificate validation
    { name: 'rejectUnauthorized false accepts any certificate', code: "const options = { rejectUnauthorized: false }", errors: [{ messageId: 'violationDetected' }] },
    { code: "https.request({ strictSSL: false })", errors: [{ messageId: 'violationDetected' }] },
    { code: "const config = { verify: false }", errors: [{ messageId: 'violationDetected' }] },
    // Environment variable disable
    { code: "process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'", errors: [{ messageId: 'violationDetected' }] },

    // ── checkServerIdentity stubbed out ───────────────────────────────────
    // Corpus lock: benchmarks/corpus/CWE-295/vulnerable/
    //              tls-checkserveridentity-noop.js
    {
      code: `
        tls.connect({
          host,
          port: 443,
          checkServerIdentity: () => undefined,
        });
      `,
      errors: [{ messageId: 'noopHostnameVerification' }],
    },
    {
      code: "tls.connect({ checkServerIdentity: () => null })",
      errors: [{ messageId: 'noopHostnameVerification' }],
    },
    {
      code: "tls.connect({ checkServerIdentity: () => void 0 })",
      errors: [{ messageId: 'noopHostnameVerification' }],
    },
    {
      code: "tls.connect({ checkServerIdentity: () => {} })",
      errors: [{ messageId: 'noopHostnameVerification' }],
    },
    {
      code: "tls.connect({ checkServerIdentity: function () { return; } })",
      errors: [{ messageId: 'noopHostnameVerification' }],
    },
    {
      code: "tls.connect({ checkServerIdentity: function (h, c) { log(h); return undefined; } })",
      errors: [{ messageId: 'noopHostnameVerification' }],
    },
    {
      code: "tls.connect({ checkServerIdentity: (h, c) => { return true; } })",
      errors: [{ messageId: 'noopHostnameVerification' }],
    },
    // A nested property that is not the open checkServerIdentity must not pop
    // the stack out from under it.
    {
      code: "tls.connect({ checkServerIdentity: () => { emit({ level: 'debug' }); } })",
      errors: [{ messageId: 'noopHostnameVerification' }],
    },
  ],


});

// A certificate check relaxed in a TEST file.
//
// An integration test that points at a local server with a self-signed
// certificate has no other way to talk to it. Verified on
// mariadb-corporation/mariadb-connector-nodejs: 41 findings between this rule
// and its sibling, every single one under `test/`.
ruleTester.run('no-disabled-certificate-validation - test files', noDisabledCertificateValidation, {
  valid: [{ code: `const opts = { ssl: { rejectUnauthorized: false } };`, filename: 'test/integration/auth-plugin.test.js' }],
  invalid: [
    // Production code is untouched.
    { code: `const opts = { ssl: { rejectUnauthorized: false } };`, filename: 'lib/connection.js', errors: 1 },
  ],
});
