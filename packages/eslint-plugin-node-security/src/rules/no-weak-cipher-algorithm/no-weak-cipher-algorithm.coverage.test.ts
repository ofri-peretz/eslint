/**
 * Coverage-gap tests for no-weak-cipher-algorithm (dual-layer doctrine, Layer 1).
 * Targets: allowInTests bypass, zero-argument cipher calls.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noWeakCipherAlgorithm } from './index';

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

describe('no-weak-cipher-algorithm coverage gaps', () => {
  ruleTester.run('no-weak-cipher-algorithm', noWeakCipherAlgorithm, {
    valid: [
      // allowInTests + test filename → listener bails out on weak cipher
      {
        code: 'crypto.createCipheriv("des-cbc", key, iv);',
        options: [{ allowInTests: true }],
        filename: 'cipher.test.ts',
      },
      // allowInTests but non-test file, safe cipher → regex operand false
      {
        code: 'crypto.createCipheriv("aes-256-gcm", key, iv);',
        options: [{ allowInTests: true }],
        filename: 'cipher.ts',
      },
      // Zero-argument cipher call → firstArg is undefined (?. short-circuit)
      { code: 'crypto.createCipheriv();' },
      { code: 'createCipheriv();' },
    ],
    invalid: [],
  });
});
