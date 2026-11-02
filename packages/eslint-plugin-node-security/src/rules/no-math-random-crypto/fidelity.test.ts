/**
 * no-math-random-crypto — divergence the Quint fidelity model found
 * (benchmarks/suites/fidelity/models/node-security/no_math_random_crypto.qnt):
 * `globalThis.Math.random()` reads the same PRNG as `Math.random()` and was
 * silent in a cryptographic context.
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

describe('no-math-random-crypto fidelity', () => {
  ruleTester.run('Math through a global object', noMathRandomCrypto, {
    valid: [
      {
        name: 'globalThis.Math.random for a retry jitter is not cryptographic',
        code: `export const delay = 100 + globalThis.Math.random() * 50;`,
      },
      {
        name: 'a Math property on an unrelated object is not the global Math',
        code: `const lib = { Math: { random: () => 4 } };
export const salt = lib.Math.random().toString(36).slice(2);`,
      },
    ],
    invalid: [
      {
        name: 'globalThis.Math.random as a salt is reported',
        code: `export const salt = globalThis.Math.random().toString(36).slice(2);`,
        errors: 1,
      },
      {
        name: 'globalThis.Math.random returned from a session-token generator is reported',
        code: `export function generateSessionToken() { return globalThis.Math.random().toString(36).slice(2); }`,
        errors: 1,
      },
      {
        name: "window['Math'].random as a nonce is reported",
        code: `export const nonce = window['Math'].random().toString(36);`,
        errors: 1,
      },
      {
        name: 'random destructured from globalThis.Math as a token is reported',
        code: `const { random } = globalThis.Math;
export const token = random().toString(36);`,
        errors: 1,
      },
    ],
  });
});
