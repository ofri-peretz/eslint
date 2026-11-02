/**
 * no-insecure-key-derivation — the edges Stryker found unpinned.
 *
 * Each case states one claim about the rule's documented behaviour: which
 * callees run PBKDF2 at its own argument positions, and which iteration
 * counts fold to a number.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noInsecureKeyDerivation } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

/** One insufficient-iterations report whose suggestion yields `output`. */
function lowCount(actual: string, output: string) {
  return [
    {
      messageId: 'insufficientIterations' as const,
      data: { actual, minimum: '100000' },
      suggestions: [{ messageId: 'useMinIterations' as const, output }],
    },
  ];
}

describe('no-insecure-key-derivation mutation edges', () => {
  ruleTester.run('no-insecure-key-derivation', noInsecureKeyDerivation, {
    valid: [
      // ── which callees are PBKDF2 at its own positions ────────────────────
      {
        name: 'a partially applied pbkdf2 takes the iteration count at a new position',
        code: [
          'import crypto from "node:crypto";',
          'import { partial } from "lodash";',
          'const derive = partial(crypto.pbkdf2Sync, password);',
          'derive(salt, 600000, 64, "sha512");',
        ].join('\n'),
      },
      {
        name: 'a partially applied pbkdf2 called inline is not util.promisify',
        code: [
          'import crypto from "node:crypto";',
          'import { partial } from "lodash";',
          'partial(crypto.pbkdf2Sync, password)(salt, 600000, 64, "sha512");',
        ].join('\n'),
      },
      {
        name: 'a local wrapper around pbkdf2 is not util.promisify',
        code: [
          'import crypto from "node:crypto";',
          'function withPassword(fn, pw) { return (...rest) => fn(pw, ...rest); }',
          'const derive = withPassword(crypto.pbkdf2Sync, password);',
          'derive(salt, 600000, 64, "sha512");',
        ].join('\n'),
      },
      {
        name: 'util.promisify called inline with no target names no function',
        code: [
          'import util from "node:util";',
          'util.promisify()(p, s, 1000, 32, "sha256");',
        ].join('\n'),
      },
      {
        name: 'a function with an iterations option that is not PBKDF2 is not judged',
        code: 'retry(task, delay, { iterations: 3 });',
      },
      {
        name: 'a crypto-js call with no explicit iterations key is not judged',
        code: [
          'import CryptoJS from "crypto-js";',
          'CryptoJS.PBKDF2(p, s, { keySize: 8 });',
        ].join('\n'),
      },
      // ── what folds to a number ───────────────────────────────────────────
      {
        name: 'a product with an unresolved factor is no evidence',
        code: 'crypto.pbkdf2Sync(p, s, 1000 * factor, 32, "sha256");',
      },
      {
        name: 'a sum of constants that reaches the minimum is not reported',
        code: [
          'const BASE = 60000;',
          'const EXTRA = 50000;',
          'crypto.pbkdf2Sync(p, s, BASE + EXTRA, 32, "sha256");',
        ].join('\n'),
      },
      {
        name: 'an object key that reads itself resolves to nothing, and terminates',
        code: [
          'const KDF = { iterations: KDF.iterations };',
          'crypto.pbkdf2Sync(p, s, KDF.iterations, 32, "sha256");',
        ].join('\n'),
      },
    ],
    invalid: [
      {
        name: 'a bare PBKDF2 imported from crypto-js is judged',
        code: [
          'import { PBKDF2 } from "crypto-js";',
          'PBKDF2(p, s, { keySize: 8, iterations: 1000 });',
        ].join('\n'),
        errors: lowCount(
          '1000',
          [
            'import { PBKDF2 } from "crypto-js";',
            'PBKDF2(p, s, { keySize: 8, iterations: 100000 });',
          ].join('\n'),
        ),
      },
      {
        name: 'a difference below the minimum is reported',
        code: 'crypto.pbkdf2Sync(p, s, 200000 - 150000, 32, "sha256");',
        errors: lowCount(
          '50000',
          'crypto.pbkdf2Sync(p, s, 100000, 32, "sha256");',
        ),
      },
      {
        name: 'a negative count is reported as the negative number it is',
        code: 'crypto.pbkdf2Sync(p, s, -1, 32, "sha256");',
        errors: lowCount(
          '-1',
          'crypto.pbkdf2Sync(p, s, 100000, 32, "sha256");',
        ),
      },
      {
        name: 'the same constant read twice in one sum still folds',
        code: [
          'const W = 1000;',
          'crypto.pbkdf2Sync(p, s, W + W, 32, "sha256");',
        ].join('\n'),
        errors: lowCount(
          '2000',
          [
            'const W = 1000;',
            'crypto.pbkdf2Sync(p, s, 100000, 32, "sha256");',
          ].join('\n'),
        ),
      },
      {
        name: 'BUG: a const alias chain longer than the old fold budget still folds',
        code: [
          'const R1 = 1000;',
          'const R2 = R1;',
          'const R3 = R2;',
          'const R4 = R3;',
          'const R5 = R4;',
          'const R6 = R5;',
          'const R7 = R6;',
          'const R8 = R7;',
          'crypto.pbkdf2Sync(p, s, R8, 32, "sha256");',
        ].join('\n'),
        errors: lowCount(
          '1000',
          [
            'const R1 = 100000;',
            'const R2 = R1;',
            'const R3 = R2;',
            'const R4 = R3;',
            'const R5 = R4;',
            'const R6 = R5;',
            'const R7 = R6;',
            'const R8 = R7;',
            'crypto.pbkdf2Sync(p, s, R8, 32, "sha256");',
          ].join('\n'),
        ),
      },
    ],
  });
});
