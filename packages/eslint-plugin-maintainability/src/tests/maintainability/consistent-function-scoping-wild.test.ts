/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A test-framework callback is inline by design.
 *
 * The rule already knows that `arr.map(cb)` and `setTimeout(cb)` pass functions
 * that are inline BY DESIGN and exempts them — there is a host list for method
 * callees and another for identifier callees. `describe`, `it`, `test` and the
 * lifecycle hooks were on neither, so every block in every spec file reported.
 *
 * Measured on the real-source scan: 1,415 findings across two small
 * repositories, on lines like
 * `describe("request test suite", function () {` — the callback cannot be
 * moved to module scope, because moving it is the same as deleting the test.
 *
 * The `invalid` cases are the shape the rule is actually for: a helper nested
 * inside a function, closing over nothing from it.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe as suite, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { consistentFunctionScoping } from '../../rules/maintainability/consistent-function-scoping';

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

suite('consistent-function-scoping — the shapes real code produces', () => {
  ruleTester.run('wild', consistentFunctionScoping, {
    valid: [
      {
        // @source nwutils/getter tests/specs/request.test.js:10
        // @found real-source scan
        name: 'FP: a describe block — 1,415 findings in the wild',
        code: 'describe("request test suite", function () { const x = 1; });',
      },
      {
        // @source telepat-io/otto extension/test/network-intercept-emission.test.ts:5
        // @found real-source scan
        name: 'FP: a test block',
        code: 'test("createEmitUpdate sends messages", async () => { const y = 2; });',
      },
      { name: 'an it block', code: 'it("does the thing", () => { const z = 3; });' },
      { name: 'a beforeEach hook', code: 'beforeEach(() => { const s = setup(); });' },
      { name: 'an afterAll hook', code: 'afterAll(() => { teardown(); });' },
      // Already at the top scope, so there is nowhere to move it. These were
      // valid only by accident before the `parent`-walk fix: the direct-parent
      // check misses them, because their parent is a VariableDeclarator.
      { name: 'a module-level arrow', code: 'const pick = ({ a }) => a;' },
      { name: 'a module-level function expression', code: 'const doubler = function (x) { return x * 2; };' },
      { name: 'an exported module-level arrow', code: 'export const pick = ({ a }) => a;' },
      // No host list to configure: an argument is never reported, so a house
      // DSL nobody could have enumerated is covered for free.
      { name: 'a benchmark DSL nobody has heard of', code: 'bench("throughput", () => { work(); });' },
      {
        // @source telepat-io/otto extension/src/background.ts:217
        // @found real-source scan
        name: 'FP: addListener — `addEventListener` was on the old host list and this was not',
        code: 'chrome.storage.onChanged.addListener((changes, area) => { sync(changes); });',
      },
      {
        // @source telepat-io/otto extension/src/background.ts:101
        // @found real-source scan
        name: 'FP: a framework entry point no allowlist would contain',
        code: 'export default defineBackground(() => { start(); });',
      },
      {
        // @source telepat-io/otto extension/src/commands/check-login.ts:13
        // @found real-source scan
        name: 'FP: an object-literal method is the object, not a nested helper',
        code: 'const cmd = { name: "check", async execute(ctx) { return ctx.ok(); } };',
      },
    ],
    invalid: [
      {
        // What the rule is for: the inner helper reads nothing from `outer`.
        name: 'a helper nested inside a function it does not close over',
        code: 'function outer() { function helper() { return 42; } return helper(); }',
        errors: 1,
      },
      {
        /**
         * Silent until 2026-08, and the reason the rule looked like it worked.
         *
         * `collectReferences` walked `for (const key in node)`, which includes
         * `parent` — a link back UP the tree. So "which names does this body
         * use" was really "which names appear anywhere in the file", every
         * arrow appeared to capture its own binding, and only the `function`
         * declaration form ever reported. An arrow whose entire body is `42`
         * collected `helper, outer`.
         *
         * Arrows are the dominant modern form, so the rule was missing most of
         * what it exists to find.
         */
        // @found real-source scan
        name: 'FN: the same helper as an arrow',
        code: 'function outer() { const helper = () => 42; return helper(); }',
        errors: 1,
      },
      {
        // @found real-source scan
        name: 'FN: the same helper as a function expression',
        code: 'function outer() { const helper = function () { return 42; }; return helper(); }',
        errors: 1,
      },
      {
        name: 'a helper nested two levels deep',
        code: 'function a() { function b() { function c() { return 1; } return c(); } return b(); }',
        errors: 2,
      },
    ],
  });
});
