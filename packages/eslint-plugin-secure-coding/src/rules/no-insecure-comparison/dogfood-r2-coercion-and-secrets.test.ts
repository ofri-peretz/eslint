/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Two false positives from linting socket.io and trpc (dogfood round 2, 2026-11-20).
 *
 * 1. `"function" == typeof srv`: `typeof` always yields a string, so with a string
 *    literal on the other side `==` and `===` are the same comparison. There is no
 *    coercion to warn about.
 * 2. `error.digest === NOT_FOUND_ERROR_CODE`: `digest` is on the secret list, but the
 *    other operand is a `const` bound to a string literal in the same file. The rule
 *    already lets `error.digest === 'NEXT_NOT_FOUND'` pass, because a value written
 *    in the source is not something an attacker can learn one character at a time.
 *    Naming that literal does not make it secret.
 *
 * Controls: a secret against a value that is NOT a literal constant still reports,
 * and so does `==` against a value of unknown type.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import parser from '@typescript-eslint/parser';
import { noInsecureComparison } from './index';

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run(
  'no-insecure-comparison — dogfood round 2',
  noInsecureComparison,
  {
    valid: [
      {
        name: 'typeof against a string literal, loose (socket.io index.ts:489)',
        code: 'function f(srv) { if ("function" == typeof srv) { return 1; } }',
      },
      {
        name: 'typeof on the left, loose inequality',
        code: 'function f(srv) { if (typeof srv != "object") { return 1; } }',
      },
      {
        name: 'typeof against a const string, loose',
        code: 'const FN = "function"; function f(srv) { return typeof srv == FN; }',
      },
      {
        name: 'a secret-named member against a const bound to a string literal (trpc rethrowNextErrors.ts:23)',
        code: "const NOT_FOUND_ERROR_CODE = 'NEXT_NOT_FOUND'; function f(error) { return error.digest === NOT_FOUND_ERROR_CODE; }",
      },
      {
        name: 'a const bound to a template literal with no interpolation',
        code: 'const CODE = `NEXT_REDIRECT`; function f(error) { return error.digest === CODE; }',
      },
      {
        name: 'the same, inequality, constant on the left',
        code: "const REDIRECT = 'NEXT_REDIRECT'; function f(error) { return REDIRECT !== error.digest; }",
      },
    ],
    invalid: [
      {
        name: 'control: a secret against a let binding is not a literal constant',
        code: "let expected = 'x'; function f(token) { return token === expected; }",
        errors: [
          {
            messageId: 'timingUnsafeComparison',
            suggestions: [
              {
                messageId: 'useTimingSafeEqual',
                output:
                  "let expected = 'x'; function f(token) { return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected)); }",
              },
            ],
          },
        ],
      },
      {
        name: 'control: a secret against a const read from the environment is still a secret',
        code: 'const EXPECTED = process.env.TOKEN; function f(token) { return token === EXPECTED; }',
        errors: [
          {
            messageId: 'timingUnsafeComparison',
            suggestions: [
              {
                messageId: 'useTimingSafeEqual',
                output:
                  'const EXPECTED = process.env.TOKEN; function f(token) { return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(EXPECTED)); }',
              },
            ],
          },
        ],
      },
      {
        name: 'control: an ambient const has no literal initialiser',
        code: 'declare const EXPECTED: string; function f(token) { return token === EXPECTED; }',
        errors: [
          {
            messageId: 'timingUnsafeComparison',
            suggestions: [
              {
                messageId: 'useTimingSafeEqual',
                output:
                  'declare const EXPECTED: string; function f(token) { return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(EXPECTED)); }',
              },
            ],
          },
        ],
      },
      {
        name: 'control: a binding destructured from a typeof result is not a string',
        code: "function f(input) { const { length: size } = typeof input; return size == '6'; }",
        errors: [
          {
            messageId: 'insecureComparison',
            suggestions: [
              {
                messageId: 'useStrictEquality',
                output:
                  "function f(input) { const { length: size } = typeof input; return size === '6'; }",
              },
            ],
          },
        ],
      },
      {
        name: 'control: a destructured default is not the literal it was destructured from',
        code: "const { token = process.env.TOKEN } = ''; function f(presented) { return presented === token; }",
        errors: [
          {
            messageId: 'timingUnsafeComparison',
            suggestions: [
              {
                messageId: 'useTimingSafeEqual',
                output:
                  "const { token = process.env.TOKEN } = ''; function f(presented) { return crypto.timingSafeEqual(Buffer.from(presented), Buffer.from(token)); }",
              },
            ],
          },
        ],
      },
      {
        name: 'control: typeof against a non-string operand is still loose',
        code: 'function f(srv, other) { return typeof srv == other; }',
        errors: [
          {
            messageId: 'insecureComparison',
            suggestions: [
              {
                messageId: 'useStrictEquality',
                output:
                  'function f(srv, other) { return typeof srv === other; }',
              },
            ],
          },
        ],
      },
    ],
  },
);
