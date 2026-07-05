/**
 * Coverage-gap tests for no-static-iv (dual-layer doctrine, Layer 1).
 * Targets: Buffer.from numeric-array IVs (all-literal and mixed), short
 * non-pattern string IVs, non-tracking declarators, Buffer.from(variable).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noStaticIv } from './index';

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

describe('no-static-iv coverage gaps', () => {
  ruleTester.run('no-static-iv', noStaticIv, {
    valid: [
      // Declarator without call initializer → tracking guard false
      { code: 'let pendingIv;' },
      // Short literal IV that matches no static pattern (not hex, not
      // base64) and is < 8 chars → length operand evaluates and stays false
      { code: 'crypto.createCipheriv("aes-256-gcm", key, "@#!");' },
      // Buffer.from(variable) → literal-string check false, array check false
      { code: 'crypto.createCipheriv("aes-256-gcm", key, Buffer.from(seed));' },
      // Buffer.from mixed array (identifier element) → allLiterals false
      {
        code: 'crypto.createCipheriv("aes-256-gcm", key, Buffer.from([seed, 2]));',
      },
    ],
    invalid: [
      // Buffer.from all-numeric-literal array → static IV reported
      {
        code: 'crypto.createCipheriv("aes-256-gcm", key, Buffer.from([18, 52, 86, 120]));',
        errors: [{ messageId: 'staticIv' }],
      },
    ],
  });
});
