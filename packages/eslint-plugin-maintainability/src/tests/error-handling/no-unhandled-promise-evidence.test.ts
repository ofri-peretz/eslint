/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A call is not a promise.
 *
 * `isPromiseExpression` returned `true` for every `CallExpression`, and said so
 * in its own comment: "we check all CallExpressions since we can't statically
 * determine which functions return promises". Measured on real code that is
 * not a conservative default, it is the whole rule:
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
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      ecmaFeatures: { jsx: true },
    },
  },
});

describe('no-unhandled-promise — a call is not a promise', () => {
  ruleTester.run('evidence', noUnhandledPromise, {
    valid: [
      // The evidence arm of the outer-call test: `wrap` here IS a promise, so
      // the inner call is skipped and only the outer reports.
      {
        name: 'a promise handed to another promise-returning call',
        code: 'await fetch(fetch(url));',
      },
      // The three arms of the outer-call test, each pinned so the skip cannot
      // silently widen: a computed `catch` and a computed `finally` both mean
      // the outer call IS a promise (so the inner is not reported twice), and
      // a call in CALLEE position is not an argument at all.
      {
        name: 'a wrapper chained through a computed catch',
        code: 'wrap(fetch(url))["catch"](handle);',
      },
      {
        name: 'a wrapper chained through a computed finally',
        code: 'wrap(fetch(url))["finally"](handle);',
      },
      // CALLEE position, not argument position. `fetch(url)(arg)` calls the
      // result, so the outer call is not "a promise handed to something" — it
      // is the promise being invoked, which this rule does not report on.
      {
        name: 'a promise-returning call in callee position',
        code: 'fetch(url)(arg);',
      },
      // The statement form is the only one reported. A promise whose result
      // is used may be handled somewhere this rule cannot see.
      {
        name: 'a dynamic import that is awaited',
        code: 'async function f() { await import("./m"); }',
      },
      {
        name: 'a dynamic import whose result is bound',
        code: 'const m = import("./m");',
      },
      {
        name: 'new Promise whose result is bound',
        code: 'const p = new Promise((r) => r(1));',
      },
      {
        name: 'new Promise that is returned',
        code: 'function f() { return new Promise((r) => r(1)); }',
      },
      // Constructing anything else is not a promise, whatever its position.
      { name: 'a constructor that is not Promise', code: 'new Map();' },
      { name: 'a member constructor', code: 'new lib.Thing();' },
      {
        // @source excalidraw/excalidraw dev-docs/src/components/Homepage/index.tsx:25
        name: 'a synchronous require',
        code: 'require("./styles.css");',
      },
      { name: 'a plain synchronous call', code: 'doTheThing();' },
      {
        // @source excalidraw/excalidraw dev-docs/src/pages/index.tsx:11
        name: 'a call whose result is destructured',
        code: 'const { siteConfig } = useDocusaurusContext();',
      },
      { name: 'a method call on an object', code: 'logger.info("started");' },
      {
        name: 'an empty catch callback still counts as handling',
        code: 'p.catch(() => {});',
      },
      {
        // @source excalidraw/excalidraw examples/with-script-in-browser/components/ExampleApp.tsx:467
        name: 'an optional call',
        code: 'excalidrawAPI?.setActiveTool({ type: "freedraw" });',
      },
      {
        // @source excalidraw/excalidraw dev-docs/src/components/Homepage/index.tsx:47
        name: 'a call inside JSX',
        code: 'const el = <div className={clsx("col")} />;',
      },
      {
        name: 'a synchronous array method',
        code: 'items.forEach((i) => render(i));',
      },
      // Each of these walks one branch of the evidence check to a `false`.
      {
        name: 'a computed member call that is not then',
        code: 'handlers["run"]();',
      },
      {
        name: 'a computed member call with a numeric key',
        code: 'handlers[0]();',
      },
      {
        name: 'a member call on a non-identifier receiver',
        code: 'get().run();',
      },
      {
        name: 'a Promise static that does not exist',
        code: 'Promise.notAThing(x);',
      },
      {
        name: 'a binding declared with no initialiser',
        code: 'let later;\nlater();',
      },
      {
        name: 'a binding whose initialiser is not a function',
        code: 'const table = {};\ntable();',
      },
      {
        name: 'a name with no declaration anywhere',
        code: 'function f() { arguments(); }',
      },
      {
        name: 'a name resolved from an enclosing scope',
        code: 'const sync = () => 1;\nfunction outer() { sync(); }',
      },
      {
        name: 'a non-async immediately-invoked function',
        code: '(function () { return 1; })();',
      },
      {
        // The binding resolves to an ImportSpecifier, which says nothing about
        // what the function returns. Correctly not evidence — and the reason
        // `promiseReturning` exists for the cases where the consumer knows.
        name: 'an imported name, whose body is in another file',
        code: 'import { load } from "./loader";\nload();',
      },
      // The wrapper call is a chain, not an argument, so the inner promise is
      // reached — and the `.catch` at the end of it is the handling.
      {
        name: 'a wrapped promise whose chain ends in catch',
        code: 'wrap(fetch(url)).catch(handle);',
      },
      {
        name: 'a wrapped promise whose chain ends in finally',
        code: 'wrap(fetch(url)).finally(handle);',
      },
      // The remaining arms of the nested-argument skip: a grandparent that is
      // not a member expression, one whose object is not the wrapper, and a
      // computed `["then"]` the skip does not recognise.
      {
        name: 'a wrapped promise in a fully handled chain',
        code: 'wrap(fetch(url)).then(handle).catch(onError);',
      },

      {
        name: 'a void expression, when the option allows it',
        code: 'void fetch(url);',
        options: [{ ignoreVoidExpressions: true }],
      },
    ],
    invalid: [
      {
        // Reaches the RESOLVER arm of the outer-call test: `load` is a local
        // async function, so deciding whether the outer call is a promise
        // requires resolving the binding rather than reading a name. The outer
        // call is the one reported; the inner is skipped, which is the
        // one-finding-per-defect guarantee working.
        name: 'a promise handed to a locally-declared async function',
        code: 'async function load(x) { return x; }\nload(fetch(url));',
        errors: 1,
      },
      {
        // @found grammar review
        // Sealed 2026-08-26: the nested-argument skip was unconditional, so when
        // the OUTER call was not itself a promise nothing reported at all. It now
        // decides on the outer call, which keeps one-finding-per-defect and
        // recovers the miss.
        name: 'FN: a promise handed to a call that is not itself a promise',
        code: 'console.log(fetch(url));',
        errors: 1,
      },
      {
        // @found grammar review
        name: 'FN: a dynamic import nobody awaits',
        code: 'import("./heavy-module");',
        errors: 1,
      },
      {
        // @found grammar review
        name: 'FN: new Promise as a whole statement',
        code: 'new Promise((resolve) => resolve(1));',
        errors: 1,
      },
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
        name: 'a wrapper chained through a computed then',
        code: 'wrap(fetch(url))["then"](handle);',
        errors: 1,
      },
      {
        /**
         * The one path through the nested-argument skip that does NOT skip.
         * `.then` is ACCESSED, not called, so the handled-check does not
         * return first and the inner promise reaches the skip — where the
         * grandparent is a `.then` member on the wrapper, so it is a chain
         * rather than an argument and the inner call is reported.
         */
        name: 'a wrapped promise whose then is read but never called',
        code: 'const t = wrap(fetch(url)).then;',
        errors: 1,
      },
      { name: 'a Promise static', code: 'Promise.all([a, b]);', errors: 1 },
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
      {
        // The nested call is NOT skipped when its parent call is the object of
        // a `.then`/`.catch`/`.finally` — that is a chain, not an argument.
        name: 'a promise wrapped by a call that is then chained',
        code: 'wrap(fetch(url)).then(handle);',
        errors: 1,
      },
    ],
  });
});
