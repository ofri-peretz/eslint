/**
 * Layer-1 fixture tests through the real parser, targeting branch gaps found
 * by the coverage-100 audit: member-expression callees, template-literal
 * throws, promise chains that skip nested calls, degenerate for-loops,
 * nullish-coalescing complexity, near-identical (not byte-identical)
 * function bodies, JSX allow-contexts, and unary-operator IIFEs.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';

import { errorMessage } from '../rules/error-handling/error-message';
import { noMissingErrorContext } from '../rules/error-handling/no-missing-error-context';
import { noSilentErrors } from '../rules/error-handling/no-silent-errors';
import { noUnhandledPromise } from '../rules/error-handling/no-unhandled-promise';
import { cognitiveComplexity } from '../rules/maintainability/cognitive-complexity';
import { consistentFunctionScoping } from '../rules/maintainability/consistent-function-scoping';
import { identicalFunctions } from '../rules/maintainability/identical-functions';
import { noNestedTernary } from '../rules/maintainability/no-nested-ternary';
import { noUnreadableIife } from '../rules/maintainability/no-unreadable-iife';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

/** Both IIFE suggestions prepend a TODO comment before the whole call. */
function iifeSuggestions(code: string) {
  return [
    {
      messageId: 'suggestNamedFunction' as const,
      output: `// TODO: Extract complex IIFE to named function\n${code}`,
    },
    {
      messageId: 'suggestBlockScope' as const,
      output: `// TODO: Consider using block scope { const x = ...; }\n${code}`,
    },
  ];
}

const jsxRuleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

describe('coverage fixtures', () => {
  describe('error-message: member-expression constructors are out of scope', () => {
    ruleTester.run('error-message', errorMessage, {
      valid: [
        // NewExpression with a non-Identifier callee.
        { code: 'const e = new globalThis.Error();' },
        // CallExpression with a non-Identifier callee.
        { code: 'const e = factory.Error();' },
      ],
      invalid: [],
    });
  });

  describe('no-missing-error-context: template literals and stack traces', () => {
    ruleTester.run('no-missing-error-context', noMissingErrorContext, {
      valid: [
        // Bare template-literal throw carries a message.
        { code: 'function f(x) { throw `broke: ${x}`; }' },
        // Subclass constructors (endsWith("Error")) satisfy requireStackTrace.
        {
          code: 'function f() { throw new TypeError("bad type"); }',
          options: [{ requireStackTrace: true }],
        },
        // Template literal inside the Error constructor counts as a message.
        { code: 'function f(x) { throw new Error(`fail: ${x}`); }' },
      ],
      invalid: [
        {
          // Identifier argument is neither a string literal nor a template.
          code: 'function f() { throw new Error(errVar); }',
          errors: [{ messageId: 'missingErrorContext', data: { missing: 'message' } }],
        },
        {
          // Non-Error constructor: no message and no stack trace.
          code: 'function f() { throw new Foo("boom"); }',
          options: [{ requireStackTrace: true }],
          errors: [
            {
              messageId: 'missingErrorContext',
              data: { missing: 'message and stack trace' },
            },
          ],
        },
      ],
    });
  });

  describe('no-silent-errors: allowWithComment with a comment-free file', () => {
    ruleTester.run('no-silent-errors', noSilentErrors, {
      valid: [],
      invalid: [
        {
          // allowWithComment is on, but there is no comment anywhere to justify it.
          code: 'try { risky(); } catch (error) {}',
          options: [{ allowWithComment: true }],
          errors: [{ messageId: 'silentError' }],
        },
      ],
    });
  });

  describe('no-unhandled-promise: chained and nested calls', () => {
    ruleTester.run('no-unhandled-promise', noUnhandledPromise, {
      valid: [
        // .finally callback bodies are promise-chain callbacks.
        { code: 'getData().finally(() => { cleanup(); });' },
        // Non-arrow .then callback is assumed handled.
        { code: 'fetchData().then(handleResult);' },
      ],
      invalid: [
        {
          // The outer call is unhandled; the nested argument call is skipped.
          code: 'console.log(getData());',
          errors: [{ messageId: 'unhandledPromise' }],
        },
        {
          // Nested call whose parent call ends in a plain member access.
          code: 'first(second()).third;',
          errors: [{ messageId: 'unhandledPromise' }],
        },
        {
          // .then referenced but never invoked: nothing is handled.
          code: 'foo(bar()).then;',
          errors: [
            { messageId: 'unhandledPromise' },
            { messageId: 'unhandledPromise' },
          ],
        },
        {
          // Same for .catch …
          code: 'foo(bar()).catch;',
          errors: [
            { messageId: 'unhandledPromise' },
            { messageId: 'unhandledPromise' },
          ],
        },
        {
          // … and .finally.
          code: 'foo(bar()).finally;',
          errors: [
            { messageId: 'unhandledPromise' },
            { messageId: 'unhandledPromise' },
          ],
        },
        {
          // ignoreVoidExpressions only exempts actual void expressions.
          code: 'fetch(url);',
          options: [{ ignoreVoidExpressions: true }],
          errors: [{ messageId: 'unhandledPromise' }],
        },
        {
          // A non-void unary parent is not exempted either.
          code: '!fetch(url);',
          options: [{ ignoreVoidExpressions: true }],
          errors: [{ messageId: 'unhandledPromise' }],
        },
      ],
    });
  });

  describe('cognitive-complexity: degenerate loops and nullish coalescing', () => {
    ruleTester.run('cognitive-complexity', cognitiveComplexity, {
      valid: [
        // for(;;) has null init/test/update.
        { code: 'function spin() { for (;;) { break; } }' },
        // ?? is a short-circuit operator and must count (still under limit).
        { code: 'function pick(a, b) { return a ?? b; }' },
      ],
      invalid: [],
    });
  });

  describe('consistent-function-scoping: nested functions with parameters', () => {
    const moveTodo =
      "// TODO: Move this function to module scope - it doesn't capture outer variables\n";

    ruleTester.run('consistent-function-scoping', consistentFunctionScoping, {
      valid: [
        // Function expressions assigned to variables reference their own
        // binding through the parent chain and are treated as capturing —
        // these exercise the FunctionExpression parameter bookkeeping.
        { code: 'const doubler = function (x) { return x * 2; };' },
        { code: 'const reader = function ({ a }) { return a; };' },
        // Arrow function with a destructured parameter.
        { code: 'const pick = ({ a }) => a;' },
        // Destructured variable declarations are not tracked by name.
        { code: 'const { unpacked } = source;' },
      ],
      invalid: [
        {
          // Identifier parameter on a nested declaration.
          code: 'function outer() { function inner(x) { return x + 1; } return inner; }',
          errors: [
            {
              messageId: 'inconsistentFunctionScoping',
              suggestions: [
                {
                  messageId: 'moveToModuleScope',
                  output: `function outer() { ${moveTodo}function inner(x) { return x + 1; } return inner; }`,
                },
              ],
            },
          ],
        },
        {
          // Destructured parameter on a nested declaration.
          code: 'function outer() { function inner({ a }) { return a; } return inner; }',
          errors: [
            {
              messageId: 'inconsistentFunctionScoping',
              suggestions: [
                {
                  messageId: 'moveToModuleScope',
                  output: `function outer() { ${moveTodo}function inner({ a }) { return a; } return inner; }`,
                },
              ],
            },
          ],
        },
        {
          // Anonymous function expression passed to a non-host method:
          // reported with the "anonymous function" fallback name.
          code: 'obj.customMethod(function (x) { return x + 1; });',
          errors: [
            {
              messageId: 'inconsistentFunctionScoping',
              suggestions: [
                {
                  messageId: 'moveToModuleScope',
                  output: `obj.customMethod(${moveTodo}function (x) { return x + 1; });`,
                },
              ],
            },
          ],
        },
        {
          // Callback to a plain function that is not a scheduler host.
          code: 'customFn(function (x) { return x + 1; });',
          errors: [
            {
              messageId: 'inconsistentFunctionScoping',
              suggestions: [
                {
                  messageId: 'moveToModuleScope',
                  output: `customFn(${moveTodo}function (x) { return x + 1; });`,
                },
              ],
            },
          ],
        },
        {
          // Member chain deeper than the reference-collection recursion cap.
          code: 'function outer() { function deep() { return a.b.c.d.e.f.g.h.i.j.k.l.m.n.o.p; } return deep; }',
          errors: [
            {
              messageId: 'inconsistentFunctionScoping',
              suggestions: [
                {
                  messageId: 'moveToModuleScope',
                  output: `function outer() { ${moveTodo}function deep() { return a.b.c.d.e.f.g.h.i.j.k.l.m.n.o.p; } return deep; }`,
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('identical-functions: near-identical bodies (Levenshtein path)', () => {
    ruleTester.run('identical-functions', identicalFunctions, {
      valid: [],
      invalid: [
        {
          // Same length, one digit differs: similarity just below 1.0.
          code: [
            'function calcA(x) {',
            '  const y = x + 1000;',
            '  const z = y * 2000;',
            '  return z + 3000;',
            '}',
            'function calcB(x) {',
            '  const y = x + 1000;',
            '  const z = y * 2000;',
            '  return z + 3001;',
            '}',
          ].join('\n'),
          errors: [{ messageId: 'identicalFunctions' }],
        },
        {
          // First body longer than the second: exercises the longer/shorter swap.
          code: [
            'function calcLong(x) {',
            '  const y = x + 1000;',
            '  const z = y * 2000;',
            '  return z + 300000;',
            '}',
            'function calcShort(x) {',
            '  const y = x + 1000;',
            '  const z = y * 2000;',
            '  return z + 3000;',
            '}',
          ].join('\n'),
          errors: [{ messageId: 'identicalFunctions' }],
        },
        {
          // A ≈ C but B is unrelated: the j-loop must skip already-grouped C.
          code: [
            'function alpha(x) {',
            '  const y = x + 1000;',
            '  const z = y * 2000;',
            '  return z + 3000;',
            '}',
            'function beta(q) {',
            '  window.dispatchEvent(new CustomEvent("ping", { detail: q }));',
            '  document.title = String(q ** 9);',
            '  return [1, 2, 3].includes(q) ? "in" : "out";',
            '}',
            'function gamma(x) {',
            '  const y = x + 1000;',
            '  const z = y * 2000;',
            '  return z + 3000;',
            '}',
          ].join('\n'),
          errors: [{ messageId: 'identicalFunctions' }],
        },
        {
          // Destructured parameters go through sourceCode.getText(param).
          code: [
            'function firstPick({ a, b }) {',
            '  const total = a + b + 7777;',
            '  const scaled = total * 11;',
            '  return scaled + 1;',
            '}',
            'function secondPick({ a, b }) {',
            '  const total = a + b + 7777;',
            '  const scaled = total * 11;',
            '  return scaled + 1;',
            '}',
          ].join('\n'),
          errors: [{ messageId: 'identicalFunctions' }],
        },
        {
          // Anonymous arrow functions fall back to the "anonymous" name.
          code: [
            'register((x) => {',
            '  const y = x + 1000;',
            '  const z = y * 2000;',
            '  return z + 3000;',
            '});',
            'register((x) => {',
            '  const y = x + 1000;',
            '  const z = y * 2000;',
            '  return z + 3000;',
            '});',
          ].join('\n'),
          errors: [{ messageId: 'identicalFunctions' }],
        },
      ],
    });
  });

  describe('no-nested-ternary: member expressions and allow contexts', () => {
    ruleTester.run('no-nested-ternary', noNestedTernary, {
      valid: [
        // Plain member access in a branch contains no ternary.
        { code: 'const s = flag ? obj.prop : other;' },
      ],
      invalid: [
        {
          // Ternary hidden inside a computed member property.
          code: 'const r = flag ? x[cond ? 1 : 2] : z;',
          errors: [{ messageId: 'noNestedTernary' }],
        },
        {
          // allow list is set but nothing in the chain matches it.
          code: 'const t = a ? (b ? 1 : 2) : 3;',
          options: [{ allow: ['return'] }],
          errors: [{ messageId: 'noNestedTernary' }],
        },
      ],
    });

    jsxRuleTester.run('no-nested-ternary (jsx)', noNestedTernary, {
      valid: [
        {
          // Nested ternary inside JSX, reached through a call argument so the
          // walker inspects non-container ancestors before the container.
          code: 'const view = <div>{fn(a ? (b ? 1 : 2) : 3)}</div>;',
          options: [{ allow: ['jsx'] }],
        },
      ],
      invalid: [],
    });
  });

  describe('no-unreadable-iife: unary IIFEs and single-issue reports', () => {
    ruleTester.run('no-unreadable-iife', noUnreadableIife, {
      valid: [
        // Unary call whose argument is not a function: not an IIFE.
        { code: '(!foo)();' },
        // Sparse array elements produce null AST entries in the depth walk.
        { code: '(function () { const arr = [1, , 2]; return arr; })();' },
      ],
      invalid: [
        {
          // Unary-negated function expression IIFE with too many statements.
          code: '(!function () { var a = 1; var b = 2; var c = 3; var d = 4; })();',
          errors: [
            {
              messageId: 'unreadableIIFE',
              suggestions: iifeSuggestions(
                '(!function () { var a = 1; var b = 2; var c = 3; var d = 4; })();',
              ),
            },
          ],
        },
        {
          // Unary void arrow IIFE with too many statements.
          code: '(void (() => { const a = 1; const b = 2; const c = 3; const d = 4; }))();',
          errors: [
            {
              messageId: 'unreadableIIFE',
              suggestions: iifeSuggestions(
                '(void (() => { const a = 1; const b = 2; const c = 3; const d = 4; }))();',
              ),
            },
          ],
        },
        {
          // Only issue is the parameter count: the non-complex suggestion text.
          code: '(function (a, b, c) { report(a + b + c); })(1, 2, 3);',
          errors: [
            {
              messageId: 'unreadableIIFE',
              suggestions: iifeSuggestions(
                '(function (a, b, c) { report(a + b + c); })(1, 2, 3);',
              ),
            },
          ],
        },
        {
          // Depth beyond maxDepth without tripping the complex-statement scan
          // (for-of is not in the hasComplexLogic statement list).
          code: '(function () { for (const x of items) { if (x) { if (x > 1) { use(x); } } } })();',
          errors: [
            {
              messageId: 'unreadableIIFE',
              suggestions: iifeSuggestions(
                '(function () { for (const x of items) { if (x) { if (x > 1) { use(x); } } } })();',
              ),
            },
          ],
        },
      ],
    });
  });
});
