/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A call is not a promise.
 *
 * This plugin's copy of the rule used the opposite construction and arrived at
 * the same place: a DENYLIST of ~120 names known to be synchronous, with
 * everything unrecognised treated as a promise. A denylist of "things that are
 * not X" has to enumerate the world; `useDocusaurusContext`, `clsx`, `dynamic`
 * and `require` were not in it.
 *
 *   excalidraw, 200 TypeScript files
 *     maintainability/no-unhandled-promise   7,061 findings   (35 per file)
 *     reliability/no-unhandled-promise       4,805 findings
 *     ─ everything else                      8,143
 *
 * 59% of every finding the suite produced on that corpus came from one idea
 * shipped twice. The lines it flagged were `<div className={clsx(...)}>`,
 * `require("…/undraw_docusaurus_tree.svg")`, and
 * `const { siteConfig } = useDocusaurusContext();` — a JSX element, a synchronous
 * require, and a destructuring. None of them is a promise.
 *
 * The cases below are the shapes that must stay quiet. Each one fails on the
 * unfixed rule.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { noUnhandledPromise } from '../../rules/error-handling/no-unhandled-promise';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
  },
});

describe('no-unhandled-promise — a call is not a promise', () => {
  ruleTester.run('evidence', noUnhandledPromise, {
    valid: [
      {
        // @source excalidraw/excalidraw dev-docs/src/components/Homepage/index.tsx:25
        name: 'a synchronous require', code: 'require("./styles.css");'
      },
      { name: 'a plain synchronous call', code: 'doTheThing();' },
      {
        // @source excalidraw/excalidraw dev-docs/src/pages/index.tsx:11
        name: 'a call whose result is destructured', code: 'const { siteConfig } = useDocusaurusContext();'
      },
      { name: 'a method call on an object', code: 'logger.info("started");' },
      { name: 'an empty catch callback still counts as handling', code: 'p.catch(() => {});' },
      {
        // @source excalidraw/excalidraw examples/with-script-in-browser/components/ExampleApp.tsx:467
        name: 'an optional call', code: 'excalidrawAPI?.setActiveTool({ type: "freedraw" });'
      },
      {
        // @source excalidraw/excalidraw dev-docs/src/components/Homepage/index.tsx:47
        name: 'a call inside JSX', code: 'const el = <div className={clsx("col")} />;'
      },
      { name: 'a synchronous array method', code: 'items.forEach((i) => render(i));' },
      {
        // `import(x)` parses as an `ImportExpression`, not a `CallExpression`,
        // so the listener never sees it. The evidence check recognises an
        // `Import` callee and is never asked — the same shape of miss as
        // `new Promise`, and for the same reason.
        name: 'FN: a dynamic import nobody awaits',
        code: 'import("./heavy-module");',
      },
      // Each of these walks one branch of the evidence check to a `false`.
      { name: 'a computed member call that is not then', code: 'handlers["run"]();' },
      { name: 'a computed member call with a numeric key', code: 'handlers[0]();' },
      { name: 'a name with no declaration anywhere', code: 'function f() { arguments(); }' },
      { name: 'a member call on a non-identifier receiver', code: 'get().run();' },
      { name: 'a Promise static that does not exist', code: 'Promise.notAThing(x);' },
      { name: 'a binding declared with no initialiser', code: 'let later;\nlater();' },
      { name: 'a binding whose initialiser is not a function', code: 'const table = {};\ntable();' },
      { name: 'a name resolved from an enclosing scope', code: 'const sync = () => 1;\nfunction outer() { sync(); }' },
      { name: 'a non-async immediately-invoked function', code: '(function () { return 1; })();' },
      {
        // A real miss, and the last uncovered branch of the rule: a promise
        // handed to another call is skipped so that `console.log(fetch(url))`
        // does not report the inner call twice — but nothing reports it once
        // either, and the rejection is unhandled.
        name: 'FN: a promise passed as an argument to another call',
        code: 'console.log(fetch(url));',
      },
      {
        // The binding resolves to an ImportSpecifier, which says nothing about
        // what the function returns. Correctly not evidence — and the reason
        // `promiseReturning` exists for the cases where the consumer knows.
        name: 'an imported name, whose body is in another file',
        code: 'import { load } from "./loader";\nload();',
      },
      {
        /**
         * A real miss, not a decision. The rule listens for `CallExpression`
         * only, so a `NewExpression` never reaches any of its checks — the
         * evidence gate above recognises `new Promise` and is never asked.
         *
         * Left as a miss rather than fixed here because the handled-check
         * (`.catch` further along, enclosing try/catch, assignment to a
         * variable that is later awaited) is written against CallExpression
         * throughout, and half-wiring it would report the handled case too.
         */
        name: 'FN: new Promise never reaches the rule — it listens for CallExpression only',
        code: 'new Promise((resolve) => resolve(1));',
      },
    ],
    invalid: [
      {
        name: 'a locally declared async function called and forgotten',
        code: 'async function save() {}\nsave();',
        errors: 1,
      },
      {
        name: 'a then chain with no catch',
        code: 'fetch(url).then((r) => r.json());',
        errors: 1,
      },
      {
        name: 'a computed then access is the same protocol',
        code: 'p["then"]((r) => r.json());',
        errors: 1,
      },
      {
        name: 'a Promise static',
        code: 'Promise.all([a, b]);',
        errors: 1,
      },
      {
        name: 'an immediately-invoked async function',
        code: '(async function () { return 1; })();',
        errors: 1,
      },
      {
        name: 'an async arrow bound to a const',
        code: 'const load = async () => {};\nload();',
        errors: 1,
      },
    ],
  });
});
