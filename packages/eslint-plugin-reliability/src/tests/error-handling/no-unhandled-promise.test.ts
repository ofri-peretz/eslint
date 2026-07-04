/**
 * Comprehensive tests for no-unhandled-promise rule
 * Error Handling: CWE-1024 - Detects unhandled Promise rejections
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import type { TSESTree } from '@interlace/eslint-devkit';
import { createWithMockContext } from '@interlace/eslint-devkit';
import {
  noUnhandledPromise,
  isPromiseHandled,
  isLikelyPromiseExpression,
} from '../../rules/error-handling/no-unhandled-promise';

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

describe('no-unhandled-promise', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - handled promises', noUnhandledPromise, {
      valid: [
        // Promise with .catch()
        {
          code: 'fetch(url).then(r => r.json()).catch(e => console.error(e));',
        },
        {
          code: 'promise.catch(error => handleError(error));',
        },
        // Promise with .then() with meaningful callback
        {
          code: 'promise.then(result => console.log(result));',
        },
        // Promise with .finally()
        {
          code: 'promise.finally(() => cleanup());',
        },
        // Await in async function
        {
          code: 'async function fn() { await fetch(url); }',
        },
        {
          code: 'async () => { await promise; }',
        },
        // In try/catch
        {
          code: `
            try {
              fetch(url);
            } catch (error) {
              console.error(error);
            }
          `,
        },
        // Test files (if ignoreInTests is true)
        {
          code: 'fetch(url);',
          filename: 'test.spec.ts',
          options: [{ ignoreInTests: true }],
        },
        // Call inside callback of a .then() chain
        {
          code: 'promise.then(result => { doSomething(result); });',
        },
        // Call inside callback of a .catch() chain
        {
          code: 'promise.catch(err => { logError(err); });',
        },
        // Void expression with ignoreVoidExpressions
        {
          code: 'void fetch(url);',
          options: [{ ignoreVoidExpressions: true }],
        },
        // .then with non-arrow callback (assumed handled)
        {
          code: 'promise.then(handler);',
        },
        // .catch with non-arrow callback
        {
          code: 'promise.catch(handler);',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Unhandled Promises', () => {
    ruleTester.run('invalid - unhandled promises', noUnhandledPromise, {
      valid: [],
      invalid: [
        // Basic unhandled fetch
        {
          code: 'fetch(url);',
          errors: [{ messageId: 'unhandledPromise' }],
        },
        // Unhandled axios call
        {
          code: 'axios.get(url);',
          errors: [{ messageId: 'unhandledPromise' }],
        },
        // Unhandled custom async function
        {
          code: 'myAsyncFunction();',
          errors: [{ messageId: 'unhandledPromise' }],
        },
        // .then() with empty callback body — still unhandled
        {
          code: 'promise.then(result => {});',
          errors: [{ messageId: 'unhandledPromise' }],
        },
      ],
    });
  });

  describe('Known-Synchronous Built-ins', () => {
    ruleTester.run('valid - sync built-ins never flagged', noUnhandledPromise, {
      valid: [
        // Direct call to a known-sync global function
        { code: 'setTimeout(cb, 100);' },
        // Method on a known-sync namespace, method name not in the sync list
        { code: 'Math.hypot(1, 2);' },
      ],
      invalid: [],
    });
  });

  describe('Delegation to Caller', () => {
    ruleTester.run('valid - returned and forwarded promises', noUnhandledPromise, {
      valid: [
        // return fn() — caller takes responsibility
        { code: 'function f() { return fetchData(); }' },
        // Concise-body arrow forwards the promise
        { code: 'const g = () => fetchData();' },
      ],
      invalid: [],
    });
  });

  describe('Chain Detection Edge Cases', () => {
    ruleTester.run('promise-chain walk-up variants', noUnhandledPromise, {
      valid: [
        // .finally directly on a call result handles it
        { code: 'doWork().finally(cleanup);' },
        // Inner call skipped when wrapped by a sync-namespace outer call
        { code: 'String(fetchData());' },
      ],
      invalid: [
        // IIFE — callee is neither Identifier nor MemberExpression
        {
          code: '(function () { return 1; })();',
          errors: [{ messageId: 'unhandledPromise' }],
        },
        // Computed method call — property is not an Identifier
        {
          code: 'handlers["run"]();',
          errors: [{ messageId: 'unhandledPromise' }],
        },
        // Callback argument of a non-promise method is not a promise callback
        // (console.info is known-sync so only the inner call reports)
        {
          code: 'console.info(() => { doAsync(); });',
          errors: [{ messageId: 'unhandledPromise' }],
        },
        // Function nested in a plain declaration (not a .then/.catch arg)
        {
          code: 'const run = () => { doAsync(); };',
          errors: [{ messageId: 'unhandledPromise' }],
        },
        // Computed ["then"] access is not recognized as handling — both the
        // inner call and the outer computed call get flagged
        {
          code: 'getPromise()["then"](handleIt);',
          errors: [
            { messageId: 'unhandledPromise' },
            { messageId: 'unhandledPromise' },
          ],
        },
        // Non-promise method between call and statement (walk-up continues)
        {
          code: 'getData().map(row => row);',
          errors: [{ messageId: 'unhandledPromise' }],
        },
        // .then accessed but never called
        {
          code: 'const t = fetchData().then;',
          errors: [{ messageId: 'unhandledPromise' }],
        },
        // Call used as computed member property
        {
          code: 'const v = items[computeIndex()].value;',
          errors: [{ messageId: 'unhandledPromise' }],
        },
        // Promise-returning argument inside a chained call where the
        // promise method is ACCESSED but never called: isPromiseHandled
        // requires the member to be a callee, while the argument-skip
        // grandparent check does not — so the inner argument falls through
        // to report (outer call reports too: its .then is never invoked)
        {
          code: 'const t1 = process1(getData()).then;',
          errors: [
            { messageId: 'unhandledPromise' },
            { messageId: 'unhandledPromise' },
          ],
        },
        {
          code: 'const t2 = process1(getData()).catch;',
          errors: [
            { messageId: 'unhandledPromise' },
            { messageId: 'unhandledPromise' },
          ],
        },
        {
          code: 'const t3 = process1(getData()).finally;',
          errors: [
            { messageId: 'unhandledPromise' },
            { messageId: 'unhandledPromise' },
          ],
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options - ignoreInTests', noUnhandledPromise, {
      valid: [
        {
          code: 'fetch(url);',
          filename: 'test.spec.ts',
          options: [{ ignoreInTests: true }],
        },
      ],
      invalid: [
        {
          code: 'fetch(url);',
          filename: 'test.spec.ts',
          options: [{ ignoreInTests: false }],
          errors: [{ messageId: 'unhandledPromise' }],
        },
      ],
    });

    ruleTester.run('options - ignoreVoidExpressions', noUnhandledPromise, {
      valid: [
        {
          code: 'void fetch(url);',
          options: [{ ignoreVoidExpressions: true }],
        },
      ],
      invalid: [
        {
          code: 'void fetch(url);',
          options: [{ ignoreVoidExpressions: false }],
          errors: [{ messageId: 'unhandledPromise' }],
        },
        // Option enabled but the call is NOT inside a void expression
        {
          code: 'fetchData();',
          options: [{ ignoreVoidExpressions: true }],
          errors: [{ messageId: 'unhandledPromise' }],
        },
      ],
    });
  });

  describe('Computed promise-method callbacks', () => {
    ruleTester.run('computed member callee is not a promise chain', noUnhandledPromise, {
      valid: [],
      invalid: [
        // `p["then"](() => {...})` — the arrow IS an argument of a call whose
        // callee is a MemberExpression, but the property is a Literal, so
        // isInsidePromiseCallback does not treat it as a promise callback.
        // Both the outer computed call and the inner doAsync() report.
        {
          code: 'p["then"](() => { doAsync(); });',
          errors: [
            { messageId: 'unhandledPromise' },
            { messageId: 'unhandledPromise' },
          ],
        },
      ],
    });
  });

  // ---------------------------------------------------------------------
  // Layer 2 — direct unit tests for parser-unreachable branches
  // ---------------------------------------------------------------------

  describe('Layer 2: isLikelyPromiseExpression', () => {
    it('returns false for non-CallExpression nodes', () => {
      const ident = { type: 'Identifier', name: 'maybePromise' } as unknown as TSESTree.Node;
      expect(isLikelyPromiseExpression(ident)).toBe(false);
    });
  });

  describe('Layer 2: isPromiseHandled (Identifier branch)', () => {
    /** Build `<ident>.<method>` optionally wrapped in a call of that member. */
    function identInChain(
      method: string | { computed: true },
      opts: { called?: boolean; asCallee?: boolean; objectIsIdent?: boolean } = {},
    ): TSESTree.Node {
      const { called = true, asCallee = true, objectIsIdent = true } = opts;
      const ident: Record<string, unknown> = { type: 'Identifier', name: 'p' };
      const property =
        typeof method === 'string'
          ? { type: 'Identifier', name: method }
          : { type: 'Literal', value: 'then' };
      const member: Record<string, unknown> = {
        type: 'MemberExpression',
        object: objectIsIdent ? ident : { type: 'Identifier', name: 'other' },
        property,
      };
      ident.parent = member;
      if (called) {
        const call: Record<string, unknown> = {
          type: 'CallExpression',
          callee: asCallee ? member : { type: 'Identifier', name: 'f' },
          arguments: asCallee ? [] : [member],
        };
        member.parent = call;
      } else {
        member.parent = { type: 'ExpressionStatement' };
      }
      return ident as unknown as TSESTree.Node;
    }

    it('returns true when the identifier is the object of a called .then/.catch/.finally', () => {
      expect(isPromiseHandled(identInChain('then'))).toBe(true);
      expect(isPromiseHandled(identInChain('catch'))).toBe(true);
      expect(isPromiseHandled(identInChain('finally'))).toBe(true);
    });

    it('returns false when the member method is not a promise handler', () => {
      expect(isPromiseHandled(identInChain('map'))).toBe(false);
    });

    it('returns false for computed (non-Identifier) promise-method access', () => {
      expect(isPromiseHandled(identInChain({ computed: true }))).toBe(false);
    });

    it('returns false when .then is accessed but never called', () => {
      expect(isPromiseHandled(identInChain('then', { called: false }))).toBe(false);
    });

    it('returns false when the member is an argument instead of the callee', () => {
      expect(isPromiseHandled(identInChain('then', { asCallee: false }))).toBe(false);
    });

    it('returns false when the identifier is not the object of the member', () => {
      expect(isPromiseHandled(identInChain('then', { objectIsIdent: false }))).toBe(false);
    });

    it('returns false for a parentless identifier', () => {
      const orphan = { type: 'Identifier', name: 'p' } as unknown as TSESTree.Node;
      expect(isPromiseHandled(orphan)).toBe(false);
    });

    it('returns false when the identifier parent is not a MemberExpression', () => {
      const ident: Record<string, unknown> = { type: 'Identifier', name: 'p' };
      ident.parent = { type: 'ExpressionStatement' };
      expect(isPromiseHandled(ident as unknown as TSESTree.Node)).toBe(false);
    });
  });

  describe('Layer 2: create() with mock context', () => {
    it('reports a parentless promise-like call even when options is null', () => {
      // options: [null] drives the `options || {}` fallback in create();
      // a parentless CallExpression exercises the `!parent` early-return
      // branch of isPromiseDelegatedToCaller.
      const { listeners, reports } = createWithMockContext(noUnhandledPromise, {
        options: [null],
      });
      const node = {
        type: 'CallExpression',
        callee: { type: 'Identifier', name: 'doThing' },
        arguments: [],
      } as unknown as TSESTree.CallExpression;
      (listeners['CallExpression'] as (n: TSESTree.CallExpression) => void)(node);
      expect(reports).toHaveLength(1);
      expect(reports[0]).toMatchObject({ messageId: 'unhandledPromise' });
      const suggest = (reports[0] as { suggest?: { messageId: string }[] }).suggest;
      expect(suggest?.map((s) => s.messageId)).toEqual([
        'addCatch',
        'useTryCatch',
        'useAwait',
      ]);
    });
  });
});
