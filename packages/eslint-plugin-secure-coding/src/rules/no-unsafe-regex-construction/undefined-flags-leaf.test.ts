/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `undefined` as one leaf of a flags ternary is a known flag set.
 *
 * `new RegExp(source, caseSensitive ? undefined : "i")` can only be compiled
 * with no flags or with `i`; both are written out in the source. The global
 * `undefined` counts only as the global: a binding the file declares under that
 * name, or any other open leaf, still reports.
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

suite('no-unsafe-regex-construction — undefined as a flags leaf', () => {
  ruleTester.run('undefined-flags-leaf', noUnsafeRegexConstruction, {
    valid: [
      {
        // @source remix-run/react-router lib/router/utils.ts:1849
        // @found linting popular React packages
        name: 'FP: caseSensitive ? undefined : "i"',
        code: 'function f(source, caseSensitive) { return new RegExp(source, caseSensitive ? undefined : "i"); }',
      },
      {
        name: 'the leaves in the other order',
        code: 'function f(source, caseSensitive) { return new RegExp(source, caseSensitive ? "i" : undefined); }',
      },
    ],
    invalid: [
      {
        name: 'the other leaf is open: undefined does not make it closed',
        code: 'function f(source, a, extra) { return new RegExp(source, a ? undefined : extra); }',
        errors: dynamic,
      },
      {
        name: 'a parameter named undefined is a runtime value, not the global',
        code: 'function f(source, a, undefined) { return new RegExp(source, a ? undefined : "i"); }',
        errors: dynamic,
      },
    ],
  });
});
