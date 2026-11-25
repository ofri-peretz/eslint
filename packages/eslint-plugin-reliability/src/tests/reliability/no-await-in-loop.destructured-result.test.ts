/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `while (true) { const { done } = await reader.read(); if (done) break; }`
 * (trpc jsonl.ts:595, axios trackStream.js:34; dogfood round 2, 2026-11-20).
 *
 * Each read depends on the last: whether the loop runs again is decided by what
 * the await returned, so it cannot be made concurrent. The rule already exempts
 * `const r = await reader.read(); if (r.done) break;` by following the awaited
 * value into the loop's exit. A destructuring pattern is the same binding, and was
 * skipped because only a bare identifier was followed.
 *
 * Controls: a destructured result that nothing reads in the loop's exit or in the
 * next await is independent work, and is still reported.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noAwaitInLoop } from '../../rules/reliability/no-await-in-loop';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-await-in-loop — a destructured result decides the next turn', () => {
  ruleTester.run('destructured awaited value', noAwaitInLoop, {
    valid: [
      {
        name: 'the stream reader loop',
        code: 'async function f(reader) { while (true) { const { done } = await reader.read(); if (done) break; } }',
      },
      {
        name: 'done and value both taken',
        code: 'async function f(reader) { while (true) { const { done, value } = await reader.read(); if (done) return value; } }',
      },
      {
        name: 'a renamed property',
        code: 'async function f(reader) { while (true) { const { done: finished } = await reader.read(); if (finished) break; } }',
      },
      {
        name: 'array destructuring',
        code: 'async function f(next) { for (;;) { const [more] = await next(); if (!more) break; } }',
      },
      {
        name: 'a default value in the pattern',
        code: 'async function f(reader) { while (true) { const { done = false } = await reader.read(); if (done) break; } }',
      },
      {
        name: 'a rest element in the pattern',
        code: 'async function f(reader) { while (true) { const { value, ...meta } = await reader.read(); if (meta.done) break; } }',
      },
      {
        name: 'a nested pattern with a hole',
        code: 'async function f(next) { for (;;) { const [, { last }] = await next(); if (last) break; } }',
      },
    ],
    invalid: [
      {
        name: 'control: done comes from another field of a literal than the awaited one',
        code: 'async function f(next) { while (true) { const { value, done } = { value: await next(), done: false }; use(value); if (done) break; } }',
        errors: [{ messageId: 'awaitInLoop' }],
      },
      {
        name: 'control: the destructured value never reaches the exit or the next await',
        code: 'async function f(items) { for (const item of items) { const { id } = await save(item); log(id); } }',
        errors: [{ messageId: 'awaitInLoop' }],
      },
      {
        name: 'control: the exit reads something else',
        code: 'async function f(reader, flag) { while (true) { const { value } = await reader.read(); use(value); if (flag) break; } }',
        errors: [{ messageId: 'awaitInLoop' }],
      },
    ],
  });
});
