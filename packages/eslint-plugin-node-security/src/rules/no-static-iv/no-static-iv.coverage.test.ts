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
      // A constructor called with NO argument supplies neither bytes nor a
      // length, so there is nothing to judge. Positive control: the same
      // constructor WITH a length (`new Uint8Array(16)`) is reported in
      // no-static-iv.test.ts — that is the all-zero IV.
      { code: 'createCipheriv("aes-256-cbc", key, new Uint8Array());' },
      { code: 'createCipheriv("aes-256-cbc", key, Buffer.alloc());' },
      // A destructured `let` has no single enumerable set of writes: the rule
      // cannot see every value `iv` can hold, and "cannot enumerate" is treated
      // as no evidence, never as safe. Positive control: the same code with a
      // plain `let iv = Buffer.alloc(16)` IS reported, immediately below.
      { code: 'let { iv } = opts;\ncreateCipheriv("aes-256-cbc", key, iv);' },
      // Same contract from the other side — a write reference with no
      // expression behind it (`iv++` is a read-modify-write, not an
      // assignment) means the set of values cannot be enumerated. Pinning the
      // contract, not calling this code safe: `iv++` on a Buffer yields NaN.
      {
        code: 'let iv = Buffer.alloc(16);\niv++;\ncreateCipheriv("aes-256-cbc", key, iv);',
      },
      // A name declared twice has no single provenance, and picking the first
      // declaration would make the verdict depend on statement order. Same
      // rule `constInitializerOf` applies. Positive control: one `var`
      // declaration of the identical buffer IS reported, below.
      {
        code: 'var iv = Buffer.alloc(16);\nvar iv = Buffer.from("00112233445566778899aabbccddeeff", "hex");\ncreateCipheriv("aes-256-cbc", key, iv);',
      },
    ],
    invalid: [
      // Buffer.from all-numeric-literal array → static IV reported
      {
        code: 'crypto.createCipheriv("aes-256-gcm", key, Buffer.from([18, 52, 86, 120]));',
        errors: [{ messageId: 'staticIv' }],
      },
      // Positive control for the destructured-`let` and `iv++` valid cases
      // above: an enumerable `let` bound to a zero buffer IS the all-zero IV.
      {
        code: 'let iv = Buffer.alloc(16);\ncreateCipheriv("aes-256-cbc", key, iv);',
        errors: [{ messageId: 'staticIv' }],
      },
      // Positive control for the double-`var` valid case: a single declaration
      // of the same zero buffer is enumerable and reported.
      {
        code: 'var iv = Buffer.alloc(16);\ncreateCipheriv("aes-256-cbc", key, iv);',
        errors: [{ messageId: 'staticIv' }],
      },
      // Evidence, not names. A binding that merely SHARES a fill function's
      // name and is then *called* has not been filled with anything — the
      // random-fill evidence requires the buffer to be an ARGUMENT to the fill.
      // Delete that argument check and this zero IV goes silently unreported.
      {
        code: 'const randomFillSync = Buffer.alloc(16);\nrandomFillSync();\ncreateCipheriv("aes-256-cbc", key, randomFillSync);',
        errors: [{ messageId: 'staticIv' }],
      },
      // Dynamic dispatch off a config table names no function the rule can
      // resolve, so it is not proof of a CSPRNG fill and the zero IV stands.
      // Positive control: `randomFillSync(iv)` on the same shape is silent
      // (no-static-iv.test.ts, "randomFill" valid cases).
      {
        code: 'const iv = Buffer.alloc(16);\nfillers[mode](iv);\ncreateCipheriv("aes-256-cbc", key, iv);',
        errors: [{ messageId: 'staticIv' }],
      },
    ],
  });
});
