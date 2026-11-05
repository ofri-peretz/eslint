/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The error-handling rules here are the same contract as eslint-plugin-
 * reliability's and share its test files. These are the cases this plugin's
 * suite carried before the two copies were brought back in line, kept so the
 * realignment drops none of them.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { noMissingErrorContext } from '../../rules/error-handling/no-missing-error-context';
import { noSilentErrors } from '../../rules/error-handling/no-silent-errors';
import { noUnhandledPromise } from '../../rules/error-handling/no-unhandled-promise';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
});

describe('maintainability-only error-handling cases', () => {
  ruleTester.run('no-missing-error-context', noMissingErrorContext, {
    valid: [
      {
        name: 'a built-in Error subclass with a message',
        code: 'throw new TypeError("Invalid type");',
        options: [{ requireMessage: true }],
      },
      {
        name: 'ignoreInTests also skips an ESM test file (.test.mjs)',
        code: 'throw new Error();',
        filename: 'test.test.mjs',
        options: [{ ignoreInTests: true, requireMessage: true }],
      },
    ],
    invalid: [],
  });

  ruleTester.run('no-silent-errors', noSilentErrors, {
    valid: [
      {
        name: 'ignoreInTests also skips an ESM test file (.test.mjs)',
        code: 'try { doSomething(); } catch (error) {}',
        filename: 'test.test.mjs',
        options: [{ ignoreInTests: true }],
      },
    ],
    invalid: [],
  });

  ruleTester.run('no-unhandled-promise', noUnhandledPromise, {
    valid: [
      {
        name: 'a wrapped promise whose chain ends in catch',
        code: 'wrap(fetch(url)).catch(handle);',
      },
      {
        name: 'a wrapped promise whose chain ends in finally',
        code: 'wrap(fetch(url)).finally(handle);',
      },
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
        name: 'a configured promise-returning receiver',
        code: 'axios.get(url);',
        options: [{ promiseReturning: ['fetch', 'axios'] }],
        errors: [{ messageId: 'unhandledPromise' }],
      },
      {
        name: 'a locally declared async function, called and forgotten',
        code: 'async function myAsyncFunction() {}\nmyAsyncFunction();',
        errors: [{ messageId: 'unhandledPromise' }],
      },
      {
        name: 'a then chain with no catch',
        code: 'promise.then(result => console.log(result));',
        errors: [{ messageId: 'unhandledPromise' }],
      },
      {
        name: 'a wrapper chained through a computed then',
        code: 'wrap(fetch(url))["then"](handle);',
        errors: 1,
      },
      {
        name: 'a wrapped promise whose then is read but never called',
        code: 'const t = wrap(fetch(url)).then;',
        errors: 1,
      },
      { name: 'a Promise static', code: 'Promise.all([a, b]);', errors: 1 },
      {
        name: 'a promise wrapped by a call that is then chained',
        code: 'wrap(fetch(url)).then(handle);',
        errors: 1,
      },
    ],
  });
});
