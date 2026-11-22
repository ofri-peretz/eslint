/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `!!value && !Array.isArray(value) && typeof value === 'object'` (trpc utils.ts:35).
 *
 * `!!value` is a truthiness test, strictly stronger than `value !== null`, and the
 * rule already accepts the bare `value && typeof value === 'object'` form. The
 * double negation and `Boolean(value)` are the same guard spelled to return a boolean.
 *
 * Controls: `!value` in the wrong chain, `Boolean(other)` for a different operand.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import parser from '@typescript-eslint/parser';
import { noImproperTypeValidation } from './index';

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run(
  'no-improper-type-validation — double negation guard',
  noImproperTypeValidation,
  {
    valid: [
      {
        name: 'a negated Boolean rejects null before the typeof test',
        code: "function f(value) { if (!Boolean(value) || typeof value !== 'object') { return; } }",
      },
      {
        name: 'the trpc isObject guard',
        code: "function isObject(value) { return !!value && !Array.isArray(value) && typeof value === 'object'; }",
      },
      {
        name: 'Boolean(value) is the same guard',
        code: "function f(value) { return Boolean(value) && typeof value === 'object'; }",
      },
      {
        name: 'the guard after the typeof test is the same chain',
        code: "function f(value) { return typeof value === 'object' && !!value; }",
      },
      {
        name: 'a member path, as in req.body',
        code: "function f(req) { return !!req.body && typeof req.body === 'object'; }",
      },
      {
        name: 'the negated chain: bail unless truthy and an object',
        code: "function f(value) { if (!!!value || typeof value !== 'object') { return; } }",
      },
    ],
    invalid: [
      {
        name: 'control: a local Boolean is not the constructor',
        code: "function f(value, Boolean) { return Boolean(value) && typeof value === 'object'; }",
        errors: [{ messageId: 'unsafeTypeofCheck' }],
      },
      {
        name: 'control: the polarity still matters for a negated Boolean',
        code: "function f(value) { return !Boolean(value) && typeof value === 'object'; }",
        errors: [{ messageId: 'unsafeTypeofCheck' }],
      },
      {
        name: 'control: a truthiness test on a different operand guards nothing',
        code: "function f(value, other) { return !!other && typeof value === 'object'; }",
        errors: [{ messageId: 'unsafeTypeofCheck' }],
      },
      {
        name: 'control: Boolean of a different operand guards nothing',
        code: "function f(value, other) { return Boolean(other) && typeof value === 'object'; }",
        errors: [{ messageId: 'unsafeTypeofCheck' }],
      },
      {
        name: 'control: a bare typeof is still reported',
        code: "function f(value) { return typeof value === 'object'; }",
        errors: [{ messageId: 'unsafeTypeofCheck' }],
      },
    ],
  },
);
