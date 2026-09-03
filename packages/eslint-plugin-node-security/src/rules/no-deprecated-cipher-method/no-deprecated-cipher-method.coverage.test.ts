/**
 * Coverage-gap tests for no-deprecated-cipher-method (dual-layer doctrine, Layer 1).
 * Targets: allowInTests bypass, standalone createDecipher ternary alternative.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDeprecatedCipherMethod } from './index';

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

describe('no-deprecated-cipher-method coverage gaps', () => {
  ruleTester.run('no-deprecated-cipher-method', noDeprecatedCipherMethod, {
    valid: [
      // allowInTests + test filename → listener bails out on deprecated call
      {
        code: 'crypto.createCipher("aes192", pw);',
        options: [{ allowInTests: true }],
        filename: 'cipher.test.ts',
      },
      // allowInTests but not a test file, safe call → regex operand false
      {
        code: 'crypto.createCipheriv("aes-256-gcm", key, iv);',
        options: [{ allowInTests: true }],
        filename: 'cipher.ts',
      },
    ],
    invalid: [
      // Standalone createDecipher → ternary picks createDecipheriv
      {
        code: 'createDecipher("aes192", pw);',
        errors: [
          {
            messageId: 'deprecatedCipherMethod',
            suggestions: [
              {
                messageId: 'useCipheriv',
                output: 'createDecipheriv("aes192", pw);',
              },
            ],
          },
        ],
      },
    ],
  });
});
