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
          name: 'the chain ends in .catch',
          code: 'fetch(url).then(r => r.json()).catch(e => console.error(e));',
        },
        {
          code: 'promise.catch(error => handleError(error));',
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
          name: 'a floating fetch — rejection goes nowhere',
          code: 'fetch(url);',
          errors: [{ messageId: 'unhandledPromise' }],
        },
        {
          // `axios` is not in the default `promiseReturning` list and cannot be
          // resolved from the file, so the consumer names it. A rule that
          // decides from a name has to let the consumer own the name.
          name: 'a configured promise-returning receiver',
          code: 'axios.get(url);',
          options: [{ promiseReturning: ['fetch', 'axios'] }],
          errors: [{ messageId: 'unhandledPromise' }],
        },
        {
          // The declaration is the evidence. Without it this case asserted only
          // that the rule reported every call, which it did — 35 times per file
          // on real code.
          name: 'a locally declared async function, called and forgotten',
          code: 'async function myAsyncFunction() {}\nmyAsyncFunction();',
          errors: [{ messageId: 'unhandledPromise' }],
        },
        {
          code: 'promise.then(result => {});', // .then() without .catch() might still be unhandled
          errors: [{ messageId: 'unhandledPromise' }],
        },
        {
          // Was asserted VALID until 2026-08. `.then` used to terminate the
          // chain before the handled-check could look for a `.catch`, so the
          // rule passed the shape it exists to catch.
          name: 'a then chain with no catch',
          code: 'promise.then(result => console.log(result));',
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
