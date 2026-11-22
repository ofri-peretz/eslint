/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `for (const [k, v] of Object.entries(event.multiValueHeaders ?? {}))` (trpc
 * getPlanner.ts:104,112,173, dogfood round 2, 2026-11-20).
 *
 * The rule already treats `.length` as a measurement of data that exists rather than
 * a count the client chose. Header collections are the same: the HTTP layer caps the
 * request head before any handler runs, so the client cannot make a loop over
 * `multiValueHeaders` or `rawHeaders` spin. The body is not bounded that way, and
 * stays reported. Plain `headers` is left alone on purpose: an existing case keeps
 * `for (const key in ctx.headers)` (ultimate-backend) as a true positive.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import parser from '@typescript-eslint/parser';
import { noUncheckedLoopCondition } from './index';

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run(
  'no-unchecked-loop-condition — header collections',
  noUncheckedLoopCondition,
  {
    valid: [
      {
        name: 'the trpc Lambda adapter loop',
        code: 'function f(event) { for (const [k, v] of Object.entries(event.multiValueHeaders ?? {})) { use(k, v); } }',
      },
      {
        name: 'the raw header list of a Node request',
        code: 'function f(req) { for (const h of req.rawHeaders) { use(h); } }',
      },
      {
        name: 'for-in over the multi-value headers',
        code: 'function f(event) { for (const name in event.multiValueHeaders) { use(name); } }',
      },
      {
        name: 'a nested path under rawHeaders',
        code: 'function f(req) { for (const v of req.rawHeaders.slice(2)) { use(v); } }',
      },
    ],
    invalid: [
      {
        name: 'control: a body collection is still reported',
        code: 'function f(req) { for (const item of req.body.items) { use(item); } }',
        errors: [{ messageId: 'uncheckedLoopCondition' }],
      },
      {
        name: 'control: plain headers stay reported, per the ultimate-backend case',
        code: 'function f(ctx) { for (const key in ctx.headers) { use(key); } }',
        errors: [{ messageId: 'uncheckedLoopCondition' }],
      },
      {
        name: 'control: a computed key has no property name to exempt',
        code: 'function f(req, key) { for (const item of req[key]) { use(item); } }',
        errors: [{ messageId: 'uncheckedLoopCondition' }],
      },
      {
        name: 'control: a body field next to the headers is still reported',
        code: 'function f(req) { for (const item of Object.values(req.body)) { use(item, req.headers); } }',
        errors: [{ messageId: 'uncheckedLoopCondition' }],
      },
    ],
  },
);
