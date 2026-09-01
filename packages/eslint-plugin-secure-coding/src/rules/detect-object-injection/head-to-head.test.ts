/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Run beside `eslint-plugin-security`'s `detect-object-injection` on the same
 * code, and read every disagreement as a question rather than a score.
 *
 * That neighbour rule is four lines of logic: report every computed member
 * access whose property is an `Identifier`. It is the most-installed rule of
 * this kind, so where the two differ, one of us is wrong and it is worth
 * knowing which. Three of the disagreements turned out to be OUR false
 * positives and are sealed below.
 *
 * The measured comparison, on the shapes the real-source scan produced:
 *
 *   | case                                    | ours | theirs |
 *   |-----------------------------------------|------|--------|
 *   | merge(dst, src) — the deep-extend CVE   |  1   |   2    |
 *   | merge over `req.body`                   |  1   |   2    |
 *   | copy loop over a module-local object    |  0   |   2    |
 *   | merge guarded by `Object.hasOwn`        |  0   |   2    |
 *   | `obj[req.query.p] = 1`                  |  1   | **0**  |
 *   | `labels[tag.name] = v`                  |  1   | **0**  |
 *   | `arr[arr.length] = x`                   |  0   |   0    |
 *
 * Their two zeroes are the same cause: the rule requires
 * `node.property.type === 'Identifier'`, so a key reached through a member
 * expression — which is what `req.query.p` is, and the shortest way anyone
 * writes this bug — never reaches the check. Their two-per-line counts on the
 * benign loops are the other half of the same design: no read/write
 * distinction, so a copy loop reports on both sides of the assignment.
 *
 * None of that is a reason for us to relax. It is the reason the three cases
 * below are sealed: a rule that reports ordinary array appends spends the
 * credibility it needs for the findings that matter.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe as suite, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';

import { detectObjectInjection } from './index';

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

suite('detect-object-injection, read against its nearest neighbour', () => {
  ruleTester.run('head-to-head', detectObjectInjection, {
    valid: [
      {
        // Verified by running it: `arr.length` is a number, so the key cannot
        // name a prototype slot. This is THE array-append idiom.
        // @found head-to-head with eslint-plugin-security
        name: 'FP: an array append written as a self-indexed length',
        code: 'const arr = []; arr[arr.length] = x;',
      },
      {
        // Every value `k` can hold is written out three lines up, and none of
        // them is a dangerous property. Decidable, not assumed.
        // @found head-to-head with eslint-plugin-security
        name: 'FP: a key iterated from a const array of string literals',
        code: 'const KEYS = ["alpha", "beta"]; const o = {}; for (const k of KEYS) { o[k] = 1; }',
      },
      {
        // @found head-to-head with eslint-plugin-security
        name: 'FP: the same allowlist behind Object.freeze',
        code: 'const KEYS = Object.freeze(["alpha", "beta"]); const o = {}; for (const k of KEYS) { o[k] = 1; }',
      },
      {
        // Frozen inline, never named. Same guarantee, one fewer binding.
        name: 'an allowlist frozen inline in the loop head',
        code: 'const o = {}; for (const k of Object.freeze(["alpha", "beta"])) { o[k] = 1; }',
      },
      {
        // Freeze wrapping the NAME rather than the literal: the unwrap has to
        // happen before the binding is resolved, not after.
        name: 'a named allowlist frozen at the point of use',
        code: 'const KEYS = ["alpha", "beta"]; const o = {}; for (const k of Object.freeze(KEYS)) { o[k] = 1; }',
      },
      {
        name: 'an allowlist written inline without freezing',
        code: 'const o = {}; for (const k of ["alpha", "beta"]) { o[k] = 1; }',
      },
      // The clearing must be narrow, so each escape hatch is pinned shut too.
      {
        name: 'a copy loop over a module-local object',
        code: 'const cfg = { a: 1 }; const out = {}; for (const k in cfg) { out[k] = cfg[k]; }',
      },
      {
        name: 'a merge helper guarded by Object.hasOwn',
        code: 'function merge(dst, src) { for (const k in src) { if (Object.hasOwn(src, k)) dst[k] = src[k]; } }',
      },
    ],
    invalid: [
      {
        // The neighbour rule is silent here: `req.query.p` is a
        // MemberExpression, and it only looks at `Identifier` keys. This is
        // the shortest way the bug is actually written.
        name: 'a request value used directly as a key',
        code: 'function f(o, req) { o[req.query.p] = 1; }',
        errors: 1,
      },
      {
        name: 'the merge helper behind every deep-extend CVE',
        code: 'function merge(dst, src) { for (const k in src) { dst[k] = src[k]; } return dst; }',
        errors: 1,
      },
      {
        // Verified by execution, not by argument: calling this with
        // `'__proto__'` re-parents the instance. It is a report, not noise.
        name: 'a key written onto this, which does re-parent the object',
        code: 'class Bag { set(k, v) { this[k] = v; } }',
        errors: 1,
      },
      {
        // The allowlist clearing must not fire when the author lists a
        // dangerous property themselves.
        name: 'an allowlist that names a dangerous property',
        code: 'const KEYS = ["a", "__proto__"]; const o = {}; for (const k of KEYS) { o[k] = 1; }',
        errors: 1,
      },
      {
        name: 'a list that is not const, so its contents are not fixed',
        code: 'let KEYS = ["a"]; const o = {}; for (const k of KEYS) { o[k] = 1; }',
        errors: 1,
      },
      {
        name: 'a length read off a different object than the one indexed',
        code: 'function f(o, x) { o[x.length] = 1; }',
        errors: 1,
      },
      {
        name: 'a length reached through a computed key, not a dotted one',
        code: 'function f(o, x) { o[x["length"]] = 1; }',
        errors: 1,
      },
      {
        name: 'an array-shaped index whose object is not an identifier',
        code: 'function f(o) { o.inner[o.inner.length] = 1; }',
        errors: 1,
      },
      {
        name: 'a list produced by a call, whose contents are not in the file',
        code: 'const KEYS = getKeys(); const o = {}; for (const k of KEYS) { o[k] = 1; }',
        errors: 1,
      },
      {
        name: 'an empty list, which proves nothing about what k can hold',
        code: 'const KEYS = []; const o = {}; for (const k of KEYS) { o[k] = 1; }',
        errors: 1,
      },
      {
        name: 'a list with a hole, so one element names no value',
        code: 'const KEYS = ["a", , "b"]; const o = {}; for (const k of KEYS) { o[k] = 1; }',
        errors: 1,
      },
      {
        name: 'a list declared nowhere this file can see',
        code: 'const o = {}; for (const k of GLOBAL_KEYS) { o[k] = 1; }',
        errors: 1,
      },
      {
        // An imported list is a binding, not a declaration — its contents are
        // in another file, so nothing here proves what `k` can hold.
        name: 'a list imported from another module',
        code: 'import { KEYS } from "./keys"; const o = {}; for (const k of KEYS) { o[k] = 1; }',
        errors: 1,
      },
      {
        name: 'a list arriving as a parameter',
        code: 'function f(KEYS, o) { for (const k of KEYS) { o[k] = 1; } }',
        errors: 1,
      },
      {
        name: 'a for-of over an inline array, not a named const',
        code: 'const o = {}; for (const k of makeKeys()) { o[k] = 1; }',
        errors: 1,
      },
    ],
  });
});
