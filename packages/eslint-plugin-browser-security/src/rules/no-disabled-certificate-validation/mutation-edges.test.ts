/**
 * Mutation-survivor kill fixtures (Stryker triage, 2026-10-18).
 *
 * Each case is the input that tells the rule apart from a surviving mutant.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noDisabledCertificateValidation } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run(
  'no-disabled-certificate-validation (mutation edges)',
  noDisabledCertificateValidation,
  {
    valid: [
      {
        name: 'returning the delegated check result can report a mismatch',
        code: 'tls.connect({ checkServerIdentity: (h, c) => { const err = tls.checkServerIdentity(h, c); return err; } })',
      },
      {
        // Node rejects on any truthy return, so a negation can fail closed.
        name: 'a negated pin check returns true for an unpinned certificate',
        code: 'tls.connect({ checkServerIdentity: (host, cert) => !pinned.has(cert.fingerprint256) })',
      },
      {
        name: 'false on an unrelated option is not a TLS opt-out',
        code: 'const opts = { keepAlive: false }',
      },
      {
        name: 'an inner object property does not close the open check before its throw',
        code: 'tls.connect({ checkServerIdentity: function (h, c) { const ctx = { host: h }; throw new Error(ctx.host); } })',
      },
      {
        name: 'NODE_TLS_REJECT_UNAUTHORIZED on something other than process.env does nothing',
        code: "process.config.NODE_TLS_REJECT_UNAUTHORIZED = '0'",
      },
      {
        name: "NODE_TLS_REJECT_UNAUTHORIZED = '1' keeps verification on",
        code: "process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1'",
      },
      {
        name: 'appending to the variable does not store 0',
        code: 'process.env.NODE_TLS_REJECT_UNAUTHORIZED += 0',
      },
    ],
    invalid: [
      {
        name: 'a nested no-op check and its no-op parent are both reported',
        code: 'tls.connect({ checkServerIdentity: function (h, c) { const inner = { checkServerIdentity: () => undefined }; return undefined; } })',
        errors: [
          { messageId: 'noopHostnameVerification' },
          { messageId: 'noopHostnameVerification' },
        ],
      },
      // @found Stryker mutation-survivor triage, 2026-10-18
      {
        name: 'FN: process.env stores a numeric 0 as the string 0',
        code: 'process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0',
        errors: [{ messageId: 'violationDetected' }],
      },
      // @found Stryker mutation-survivor triage, 2026-10-18
      {
        name: 'FN: a no-substitution template 0 is the same string',
        code: 'process.env.NODE_TLS_REJECT_UNAUTHORIZED = `0`',
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        name: 'a default-assigning ??= stores 0 when the variable is unset',
        code: "process.env.NODE_TLS_REJECT_UNAUTHORIZED ??= '0'",
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        name: 'a ||= stores 0 when the variable is unset or empty',
        code: "process.env.NODE_TLS_REJECT_UNAUTHORIZED ||= '0'",
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        name: 'a &&= stores 0 over a variable that is already set',
        code: "process.env.NODE_TLS_REJECT_UNAUTHORIZED &&= '0'",
        errors: [{ messageId: 'violationDetected' }],
      },
    ],
  },
);
