/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Flags chosen between literals are not dynamic.
 *
 * ESLint's own `no-restricted-imports` and `no-warning-comments` build their
 * matcher with `new RegExp(source, caseSensitive ? "u" : "iu")`. Every value the
 * flags can take is written out in the source, which is the property the
 * "dynamic flags" note exists to find missing. A flag the program ASSEMBLES (or
 * one leaf of a ternary that is not a literal) still reports.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe as suite, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';

import { noUnsafeRegexConstruction } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = suite;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
});

const dynamic = [{ messageId: 'unsafeRegexConstruction' as const }];

suite('no-unsafe-regex-construction — flags from a closed set', () => {
  ruleTester.run('flags-from-a-closed-set', noUnsafeRegexConstruction, {
    valid: [
      {
        name: 'eslint no-restricted-imports: a ternary of two literals',
        code: 'function f(source, caseSensitive) { return new RegExp(source, caseSensitive ? "u" : "iu"); }',
      },
      {
        name: 'a nested ternary whose every leaf is a literal',
        code: 'function f(s, a, b) { return new RegExp(s, a ? "u" : b ? "iu" : "gu"); }',
      },
      {
        name: 'a template literal with no substitution as a leaf',
        code: 'function f(s, a) { return new RegExp(s, a ? `u` : `iu`); }',
      },
      {
        name: 'eslint no-warning-comments: a const bound to a literal',
        code: 'function f(s) { const flags = "iu"; return new RegExp(s, flags); }',
      },
      {
        name: 'a const bound to a ternary of literals',
        code: 'function f(s, a) { const flags = a ? "u" : "iu"; return new RegExp(s, flags); }',
      },
      {
        name: 'RegExp called without new',
        code: 'function f(s, a) { return RegExp(s, a ? "u" : "iu"); }',
      },
    ],
    invalid: [
      {
        name: 'a let that is reassigned is not a known value',
        code: 'function f(s, input) { let flags = "iu"; flags = input; return new RegExp(s, flags); }',
        errors: dynamic,
      },
      {
        name: 'a const that refers to itself is not a known value',
        code: 'function f(s) { const flags = flags; return new RegExp(s, flags); }',
        errors: dynamic,
      },
      {
        name: 'a binding with two declarations is not a known value',
        code: 'function f(s) { var flags = "u"; var flags = "i"; return new RegExp(s, flags); }',
        errors: dynamic,
      },
      {
        name: 'a flags name that resolves to nothing is dynamic',
        code: 'function f(s) { return new RegExp(s, undeclaredFlags); }',
        errors: dynamic,
      },
      {
        name: 'a const bound to something dynamic',
        code: 'function f(s, input) { const flags = input.flags; return new RegExp(s, flags); }',
        errors: dynamic,
      },
      {
        name: 'a const bound to a concatenation',
        code: 'function f(s, extra) { const flags = "g" + extra; return new RegExp(s, flags); }',
        errors: dynamic,
      },
      {
        name: 'flags read from a variable',
        code: 'function f(s, flags) { return new RegExp(s, flags); }',
        errors: dynamic,
      },
      {
        name: 'one ternary leaf is not a literal',
        code: 'function f(s, a, extra) { return new RegExp(s, a ? "u" : extra); }',
        errors: dynamic,
      },
      {
        name: 'the other ternary leaf is not a literal',
        code: 'function f(s, a, extra) { return new RegExp(s, a ? extra : "u"); }',
        errors: dynamic,
      },
      {
        name: 'a deep leaf is not a literal',
        code: 'function f(s, a, b, extra) { return new RegExp(s, a ? "u" : b ? "iu" : extra); }',
        errors: dynamic,
      },
      {
        name: 'flags assembled by concatenation',
        code: 'function f(s, extra) { return new RegExp(s, "g" + extra); }',
        errors: dynamic,
      },
      {
        name: 'a ternary leaf that is a template WITH a substitution',
        code: 'function f(s, a, extra) { return new RegExp(s, a ? "u" : `i${extra}`); }',
        errors: dynamic,
      },
    ],
  });
});
