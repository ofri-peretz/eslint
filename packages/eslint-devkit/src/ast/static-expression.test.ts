/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { AST_NODE_TYPES, ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { describe } from 'vitest';
import { isStaticExpression } from './static-expression';

/**
 * Exercised through a real rule so the scope objects are the ones ESLint actually builds —
 * a hand-rolled scope stub would pass while the production path fails.
 *
 * The probe rule reports the first argument of any `sink(...)` call it cannot prove static,
 * mirroring how a security rule consumes this.
 */
const createRule = ESLintUtils.RuleCreator(() => 'https://example.test/probe');

const makeProbe = (treatConstAsStatic: boolean) =>
  createRule({
    name: 'probe',
    meta: {
      type: 'problem',
      docs: { description: 'test probe' },
      messages: { dynamic: 'dynamic' },
      schema: [],
    },
    defaultOptions: [],
    create(context) {
      return {
        CallExpression(node: TSESTree.CallExpression) {
          if (node.callee.type !== AST_NODE_TYPES.Identifier || node.callee.name !== 'sink') return;
          const [argument] = node.arguments;
          if (!argument || argument.type === AST_NODE_TYPES.SpreadElement) return;
          const scope = context.sourceCode.getScope(node);
          const first = isStaticExpression({ node: argument, scope, treatConstAsStatic });
          // Called twice on purpose: the second call must come from the memo and agree.
          const second = isStaticExpression({ node: argument, scope, treatConstAsStatic });
          if (first !== second) throw new Error('isStaticExpression memo returned an inconsistent result');
          if (!first) {
            context.report({ node: argument, messageId: 'dynamic' });
          }
        },
      };
    },
  });

const ruleTester = new RuleTester();

describe('isStaticExpression', () => {
  ruleTester.run('static values are not reported', makeProbe(true), {
    valid: [
      { code: `sink('ls')` },
      { code: `sink(42)` },
      { code: `const CMD = 'ls'; sink(CMD);` },
      { code: `const A = 'a'; const B = A + 'b'; sink(B);` },
      // `var` counts as constant when never reassigned — the single-write check is what matters.
      { code: `var cmd = 'ls'; sink(cmd);` },
      { code: `const N = 'x'; sink(\`prefix-\${N}\`);` },
      { code: `const A = 'a'; sink(A as string);` },
      { code: `import path from 'node:path'; sink(path.join('a', 'b'));` },
      { code: `const path = require('path'); sink(path.resolve('a'));` },
      { code: `import path from 'path'; sink(path.sep);` },
      { code: `sink(import.meta.url);` },
      { code: `const A = 'a', B = 'b'; sink(cond ? A : B);` },
      // UnaryExpression over a static operand is itself static.
      { code: `sink(-1);` },
      { code: `const N = 5; sink(-N);` },
    ],
    invalid: [
      // The whole point: anything an attacker can reach must still be reported.
      { code: `sink(userInput)`, errors: [{ messageId: 'dynamic' }] },
      { code: `let cmd = 'ls'; cmd = req.query.c; sink(cmd);`, errors: [{ messageId: 'dynamic' }] },

      { code: `sink(\`prefix-\${req.query.x}\`)`, errors: [{ messageId: 'dynamic' }] },
      { code: `const A = req.query.a; sink(A);`, errors: [{ messageId: 'dynamic' }] },
      { code: `import path from 'node:path'; sink(path.join(req.query.p));`, errors: [{ messageId: 'dynamic' }] },
      { code: `const path = notTheModule; sink(path.join('a'));`, errors: [{ messageId: 'dynamic' }] },
      { code: `sink(obj[key])`, errors: [{ messageId: 'dynamic' }] },
      { code: `sink(getCommand())`, errors: [{ messageId: 'dynamic' }] },
      { code: `const A = 'a'; sink(A + req.query.b);`, errors: [{ messageId: 'dynamic' }] },
      { code: `const A = 'a', B = req.query.b; sink(cond ? A : B);`, errors: [{ messageId: 'dynamic' }] },
      { code: `sink(import.meta.resolve);`, errors: [{ messageId: 'dynamic' }] },
      // `path` is never declared, so the scope walk finds no binding to prove it is the
      // path module — abstain rather than assume the name means the builtin.
      { code: `sink(path.join('a', 'b'));`, errors: [{ messageId: 'dynamic' }] },
      { code: `sink(path.sep);`, errors: [{ messageId: 'dynamic' }] },
      // Node types with no static interpretation fall through to the default arm.
      { code: `sink([1, 2]);`, errors: [{ messageId: 'dynamic' }] },
      { code: `sink({ a: 1 });`, errors: [{ messageId: 'dynamic' }] },
      { code: `sink(function () {});`, errors: [{ messageId: 'dynamic' }] },
      { code: `sink(-userInput);`, errors: [{ messageId: 'dynamic' }] },
      // `in` / `instanceof` are membership tests, not value arithmetic — never static.
      { code: `sink('a' in obj);`, errors: [{ messageId: 'dynamic' }] },
      { code: `sink(x instanceof Error);`, errors: [{ messageId: 'dynamic' }] },
      // A private field can never be a path-module constant.
      {
        code: `class C { #x = 'a'; m() { sink(this.#x); } }`,
        filename: 'a.ts',
        errors: [{ messageId: 'dynamic' }],
      },
      // A private method call is likewise not a path helper.
      {
        code: `class C { #m() { return 'a'; } f() { sink(this.#m()); } }`,
        filename: 'a.ts',
        errors: [{ messageId: 'dynamic' }],
      },
      // A real path import, but a method that is not a pure path helper.
      {
        code: `import path from 'node:path'; sink(path.parse('a'));`,
        errors: [{ messageId: 'dynamic' }],
      },
      // A global binding has no definition to inspect.
      {
        code: `sink(path.join('a'));`,
        languageOptions: { globals: { path: 'readonly' } },
        errors: [{ messageId: 'dynamic' }],
      },
      // `import path = require('path')` resolves through TSImportEqualsDeclaration.
      {
        code: `import path = require('path'); sink(path.join('a'));`,
        filename: 'a.ts',
        errors: [{ messageId: 'dynamic' }],
      },
      // Initialised by a call that is not `require`.
      { code: `const path = load('path'); sink(path.join('a'));`, errors: [{ messageId: 'dynamic' }] },
      // A function parameter is a binding whose definition is not a variable initialiser.
      { code: `function f(p) { sink(p); }`, errors: [{ messageId: 'dynamic' }] },
      // An import binding likewise has no initialiser to fold.
      { code: `import x from 'somewhere'; sink(x);`, errors: [{ messageId: 'dynamic' }] },
      // Declared but never initialised.
      { code: `let later; sink(later);`, errors: [{ messageId: 'dynamic' }] },
      // The member's object is itself a member expression, not a plain identifier.
      { code: `sink(a.b.sep);`, errors: [{ messageId: 'dynamic' }] },
      // A configured global resolves to a variable that has no definition at all.
      {
        code: `sink(SOME_GLOBAL);`,
        languageOptions: { globals: { SOME_GLOBAL: 'readonly' } },
        errors: [{ messageId: 'dynamic' }],
      },
      // A WRITABLE global assigned once: it passes the single-write check, so the
      // missing-definition guard is the only thing standing between it and being
      // treated as a constant.
      {
        code: `WRITABLE_GLOBAL = 'ls'; sink(WRITABLE_GLOBAL);`,
        languageOptions: { globals: { WRITABLE_GLOBAL: 'writable' } },
        errors: [{ messageId: 'dynamic' }],
      },
      // A for-in binding is written exactly once but has no initialiser to fold — the
      // write-count check alone would let it through, so the init check must catch it.
      { code: `for (const k in obj) { sink(k); }`, errors: [{ messageId: 'dynamic' }] },
      { code: `for (const v of list) { sink(v); }`, errors: [{ messageId: 'dynamic' }] },
    ],
  });

  ruleTester.run('treatConstAsStatic: false hardens further', makeProbe(false), {
    valid: [{ code: `sink('ls')` }],
    invalid: [
      // Same code the default accepts — the escape hatch eslint-plugin-security does not offer.
      { code: `const CMD = 'ls'; sink(CMD);`, errors: [{ messageId: 'dynamic' }] },
    ],
  });

  // A cyclic initializer must terminate and report, not hang the lint run.
  ruleTester.run('cyclic initializers terminate', makeProbe(true), {
    valid: [],
    invalid: [
      { code: `const a = b; const b = a; sink(a);`, errors: [{ messageId: 'dynamic' }] },
    ],
  });

  // `isProd` is not static, but both branches are — the conditional still yields a constant.
  ruleTester.run('conditional test need not be static', makeProbe(true), {
    valid: [{ code: `const P = 'a', D = 'b'; sink(isProd ? P : D);` }],
    invalid: [
      { code: `const P = 'a'; sink(isProd ? P : req.query.x);`, errors: [{ messageId: 'dynamic' }] },
    ],
  });
});
