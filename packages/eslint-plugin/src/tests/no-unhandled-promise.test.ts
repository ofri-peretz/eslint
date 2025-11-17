/**
 * Comprehensive tests for no-unhandled-promise rule
 * Error Handling: CWE-1024 - Detects unhandled Promise rejections
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnhandledPromise } from '../rules/error-handling/no-unhandled-promise';

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
        // Promise with .then()
        {
          code: 'promise.then(result => console.log(result));',
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
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Unhandled Promises', () => {
    ruleTester.run('invalid - unhandled promises', noUnhandledPromise, {
      valid: [],
      invalid: [
        {
          code: 'fetch(url);',
          errors: [{ messageId: 'unhandledPromise' }],
        },
        {
          code: 'axios.get(url);',
          errors: [{ messageId: 'unhandledPromise' }],
        },
        {
          code: 'myAsyncFunction();',
          errors: [{ messageId: 'unhandledPromise' }],
        },
        {
          code: 'promise.then(result => {});', // .then() without .catch() might still be unhandled
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

