/**
 * Coverage-gap tests for no-self-signed-certs (dual-layer doctrine, Layer 1).
 * Targets: NODE_TLS_REJECT_UNAUTHORIZED assignment reporting (string and
 * numeric zero), unrelated assignments, allowInTests bypass for both listeners.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noSelfSignedCerts } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-self-signed-certs coverage gaps', () => {
  ruleTester.run('no-self-signed-certs', noSelfSignedCerts, {
    valid: [
      // Unrelated assignment → env-var member chain check is false
      { code: 'settings.timeout = 0;' },
      // allowInTests + test filename → both listeners bail out
      {
        code: [
          'const opts = { rejectUnauthorized: false };',
          "process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';",
        ].join('\n'),
        options: [{ allowInTests: true }],
        filename: 'tls.test.ts',
      },
      // allowInTests but non-test file, safe code → regex operand false
      {
        code: 'const opts = { rejectUnauthorized: true };',
        options: [{ allowInTests: true }],
        filename: 'tls.ts',
      },
    ],
    invalid: [
      // String '0' disables TLS validation → reported
      {
        code: "process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';",
        errors: [{ messageId: 'insecureTls' }],
      },
      // Numeric 0 → second operand of the value check
      {
        code: 'process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;',
        errors: [{ messageId: 'insecureTls' }],
      },
    ],
  });
});
