/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * FP-009: a dynamic FLAG is not a denial of service.
 *
 * This rule's CWE is CWE-400 — catastrophic backtracking. `g` and `y` change
 * where matching starts; they do not change what a pattern costs to run. A
 * dynamic flag reported on its own is a correctness note wearing a security
 * CWE, and in the wild it was one shape eleven times: re-compiling a pattern
 * read off an object beside that object's own flags.
 *
 * The tell was that the FLAGS argument changed the verdict on the PATTERN:
 *
 *   new RegExp(o.pattern)             silent
 *   new RegExp(o.pattern, o.flags)    reported
 *
 * Nothing about the pattern's trustworthiness changed between those two lines.
 *
 * The clearing is narrow: both sides must be non-computed reads off the same
 * identifier, which is the copy idiom `isRegexClone` already exempted for
 * `re.source`/`re.flags`. It only ever silences the FLAGS finding — an
 * untrusted pattern still reports on its own, which the cases below pin.
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

suite('no-unsafe-regex-construction — a dynamic flag is not a DoS', () => {
  ruleTester.run('dynamic-flags-alone', noUnsafeRegexConstruction, {
    valid: [
      {
        // @source the real-source scan, 11 findings
        // @found real-source scan
        name: 'FP: a pattern re-compiled beside its own object’s flags',
        code: 'function f(node) { return new RegExp(node.pattern, node.flags); }',
      },
      {
        name: 'the RegExp clone this already exempted',
        code: 'function f(re) { return new RegExp(re.source, re.flags); }',
      },
      {
        name: 'static pattern and static flags',
        code: 'const RE = new RegExp("^a+$", "g");',
      },
      {
        name: 'an opaque pattern with no flags at all, which was always quiet',
        code: 'function f(o) { return new RegExp(o.pattern); }',
      },
    ],
    invalid: [
      {
        // The clearing must not reach an untrusted pattern. Both arguments come
        // off `req.query` here, so the same-object test matches — and the
        // PATTERN check reports anyway, which is the point of keeping them
        // separate.
        name: 'an untrusted pattern still reports even when it shares an object with its flags',
        code: 'function f(req) { return new RegExp(req.query.q, req.query.f); }',
        errors: 2,
      },
      {
        name: 'an untrusted pattern with no flags',
        code: 'function f(req) { return new RegExp(req.query.q); }',
        errors: 1,
      },
      {
        name: 'flags from a different object than the pattern',
        code: 'function f(req, opts) { return new RegExp(req.body.p, opts.flags); }',
        errors: 2,
      },
    ],
  });
});
