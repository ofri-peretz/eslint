/**
 * Tests for no-math-random-crypto rule
 * CWE-338: Use of Cryptographically Weak Pseudo-Random Number Generator
 *
 * Migrated from eslint-plugin-crypto. Includes the fn-fp benchmark fixtures
 * (vuln_random_token / vuln_random_session true positives + safe_random_shuffle
 * no-false-positive) so the 40/40, 0-FP benchmark result stays locked.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noMathRandomCrypto } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-math-random-crypto', () => {
  ruleTester.run('no-math-random-crypto', noMathRandomCrypto, {
    valid: [
      // Non-crypto variable names — benign randomness
      { code: 'const count = Math.random() * 10;' },
      { code: 'const position = Math.random();' },
      { code: 'const x = Math.random() * width;' },
      { code: 'const index = Math.floor(Math.random() * array.length);' },
      // Secure alternative
      { code: 'const token = crypto.randomBytes(32).toString("hex");' },
      // Benchmark FP lock: Fisher-Yates shuffle assigns to a non-crypto var (`j`)
      // and is not returned from a crypto-named function — must NOT flag.
      {
        code: `export function safe_random_shuffle(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}`,
      },
      // Allowed in test files when opted in
      {
        code: 'const secret = Math.random();',
        filename: 'thing.test.ts',
        options: [{ allowInTests: true }],
      },
    ],

    invalid: [
      // Crypto-named variable
      {
        code: 'const token = Math.random().toString(36);',
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
      {
        code: 'const sessionSecret = Math.random();',
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
      // Benchmark TP lock: vuln_random_token (returned from a crypto-named fn)
      {
        code: `export function vuln_random_token() {
  return Math.random().toString(36).substring(2);
}`,
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
      // Benchmark TP lock: vuln_random_session
      {
        code: `export function vuln_random_session() {
  return "session_" + Math.floor(Math.random() * 1000000);
}`,
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
      // Crypto-named object property
      {
        code: 'const config = { apiKey: Math.random().toString(36) };',
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
    ],
  });
});
