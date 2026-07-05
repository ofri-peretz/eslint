/**
 * Coverage-gap tests for no-ecb-mode (dual-layer doctrine, Layer 1).
 * Targets: allowInTests test-file bypass, non-cipher calls, zero-arg cipher calls.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noEcbMode } from './index';

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

describe('no-ecb-mode coverage gaps', () => {
  ruleTester.run('no-ecb-mode', noEcbMode, {
    valid: [
      // allowInTests: true + test filename → rule bails out even for ECB
      {
        code: 'crypto.createCipheriv("aes-256-ecb", key, iv);',
        options: [{ allowInTests: true }],
        filename: 'cipher.test.ts',
      },
      // allowInTests: true but NOT a test file → regex side of && is false
      {
        code: 'crypto.createCipheriv("aes-256-gcm", key, iv);',
        options: [{ allowInTests: true }],
        filename: 'cipher.ts',
      },
      // Non-cipher call → isCipherCall false path
      { code: 'doWork();' },
      // Cipher call with zero arguments → arguments.length >= 1 is false
      { code: 'crypto.createCipheriv();' },
    ],
    invalid: [],
  });
});
