/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `if (res.error) throw res.error` and `throw this.reason` (trpc ws.ts:518 and
 * resolveResponse.ts:407, axios CancelToken.js:70, koa context.js:96; dogfood
 * round 2, 2026-11-20).
 *
 * The rule accepts `throw err` for an identifier because the error already exists
 * and carries its own message. A property read is the same re-throw one hop
 * further. "Thrown error missing message" is wrong when the message was written
 * where the value was made.
 *
 * Controls: an Error with no message and an object without one are still reported.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noMissingErrorContext } from '../../rules/error-handling/no-missing-error-context';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-missing-error-context — re-throwing a stored error', () => {
  ruleTester.run('member re-throw', noMissingErrorContext, {
    valid: [
      {
        name: 'a result object that holds an error',
        code: 'function f(res) { if (res.error) throw res.error; }',
      },
      {
        name: 'a field of this',
        code: 'class Cancel { raise() { throw this.reason; } }',
      },
      {
        name: 'a nested path',
        code: 'function f(ctx) { throw ctx.state.failure; }',
      },
      {
        name: 'a computed key',
        code: 'function f(errors, i) { throw errors[i]; }',
      },
      {
        name: 'the stack is not lost either, with requireStackTrace on',
        code: 'function f(res) { throw res.error; }',
        options: [{ requireStackTrace: true }],
      },
    ],
    invalid: [
      {
        name: 'control: an Error built with no message',
        code: 'function f() { throw new Error(); }',
        errors: [{ messageId: 'missingErrorContext' }],
      },
      {
        name: 'control: an object with no message',
        code: 'function f() { throw { code: 1 }; }',
        errors: [{ messageId: 'missingErrorContext' }],
      },
    ],
  });
});
