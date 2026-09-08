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
          name: 'a bare .catch with a handler settles the chain',
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

  /**
   * A function-typed PARAMETER is not an async function. `resolveBinding`
   * returned `def.node` for every definition, and for a parameter that node is
   * the ENCLOSING function — so inside `async function main(write)` every
   * `write(…)` inherited `main`'s `async` and reported as an unhandled promise.
   * Burgee's compat-oracle `report.ts` (`write: (s: string) => void`) drew three
   * per run and turned both twins off for the file. What the file shows about a
   * parameter is its annotation and its default, and only those count.
   * See docs/intents/burgee-false-positives/.
   */
  describe('a parameter is not the function it belongs to (burgee)', () => {
    ruleTester.run('parameter callees', noUnhandledPromise, {
      valid: [
        {
          name: 'FP: a void-typed writer parameter called inside an async function',
          // @found real-source scan (burgee, ofri-peretz/burgee eslint.config.mjs)
          code: 'export async function main(argv: string[], write: (s: string) => void): Promise<number> { write("hello"); return 0; }',
        },
        {
          name: 'FP: an untyped parameter called inside an async function says nothing about promises',
          // @found real-source scan (burgee, ofri-peretz/burgee eslint.config.mjs)
          code: 'async function main(write) { write("x"); }',
        },
        {
          name: 'FP: a parameter of an async arrow, called in its body',
          // @found real-source scan (burgee, ofri-peretz/burgee eslint.config.mjs)
          code: 'const run = async (write: (s: string) => void) => { write("x"); };',
        },
        {
          name: 'a function-typed parameter of a non-async function — the control, always quiet',
          code: 'function main(write: (s: string) => void) { write("x"); }',
        },
      ],
      invalid: [
        {
          name: 'a parameter whose annotation returns a Promise is evidence the file shows',
          code: 'async function main(save: () => Promise<void>) { save(); }',
          errors: [{ messageId: 'unhandledPromise' }],
        },
        {
          name: 'a parameter defaulted to an async arrow is evidence the file shows',
          code: 'async function main(save = async () => {}) { save(); }',
          errors: [{ messageId: 'unhandledPromise' }],
        },
        {
          name: 'a local async function called and forgotten still reports beside a quiet parameter',
          code: 'async function save() {}\nasync function main(write: (s: string) => void) { write("x"); save(); }',
          errors: [{ messageId: 'unhandledPromise' }],
        },
      ],
    });
  });
});
