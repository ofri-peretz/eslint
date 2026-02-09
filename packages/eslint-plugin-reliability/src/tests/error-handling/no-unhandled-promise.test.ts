/**
 * Comprehensive tests for no-unhandled-promise rule
 * Error Handling: CWE-1024 - Detects unhandled Promise rejections
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnhandledPromise } from '../../rules/error-handling/no-unhandled-promise';

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
      ],
    });
  });
});
