/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Which positions make a computed access a WRITE or an INVOKED READ — the only
 * two the rule reports — and which merely read.
 *
 * Two were false negatives until 2026-11: `new handlers[k]()` invokes what the
 * key selected exactly as a call does, and `delete o?.[k]` deletes `o[k]`
 * whenever `o` is not nullish; neither was reported.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { detectObjectInjection } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const reported = [{ messageId: 'objectInjection' as const }];

describe('detect-object-injection — write and invoke positions', () => {
  ruleTester.run('detect-object-injection', detectObjectInjection, {
    valid: [
      {
        name: 'a default value read inside an array destructuring target is a read',
        code: `export function f(o, k, arr) { let x; [x = o[k]] = arr; return x; }`,
      },
      {
        name: 'a computed KEY of a destructuring target is a read',
        code: `export function f(o, k, obj) { let x; ({ [o[k]]: x } = obj); return x; }`,
      },
      {
        name: 'calling a method destructured out of a keyed read invokes the method, not the read',
        code: `export function f(o, k) { const { run } = o[k]; return run(); }`,
      },
      {
        name: 'the iterable of a for-of is a read',
        code: `export function f(o, k) { for (const x of o[k]) use(x); }`,
      },
    ],
    invalid: [
      {
        // @found mutation testing
        name: 'FN: new handlers[k]() invokes what the key selected',
        code: `export function f(handlers, k) { return new handlers[k](); }`,
        errors: reported,
      },
      {
        // @found mutation testing
        name: 'FN: constructing through an alias of a keyed read invokes it',
        code: `export function f(o, k) { const Ctor = o[k]; return new Ctor(); }`,
        errors: reported,
      },
      {
        name: 'calling an alias of a keyed read invokes it',
        code: `export function f(o, k) { const fn = o[k]; return fn(); }`,
        errors: reported,
      },
      {
        // @found mutation testing
        name: 'FN: an optional-chain delete is a write',
        code: `export function f(o, k) { delete o?.[k]; }`,
        errors: reported,
      },
      {
        name: 'a delete is a write',
        code: `export function f(o, k) { delete o[k]; }`,
        errors: reported,
      },
      {
        name: 'a keyed access whose property is then assigned is a write through it',
        code: `export function f(o, k, v) { o[k].x = v; }`,
        errors: reported,
      },
      {
        name: "a keyed read used as ANOTHER write's key is reported once, for that write",
        code: `export function f(x, o, k, v) { x[o[k]] = v; }`,
        errors: reported,
      },
      {
        name: 'a for-of target is a write',
        code: `export function f(o, k, arr) { for (o[k] of arr); }`,
        errors: reported,
      },
      {
        name: 'a for-in target is a write',
        code: `export function f(o, k, src) { for (o[k] in src); }`,
        errors: reported,
      },
      {
        name: 'a write behind a non-null assertion is one finding, not two',
        code: `export function f(a, b, c, v) { a[b]![c] = v; }`,
        errors: reported,
      },
      {
        name: 'a write behind an as-cast is one finding, not two',
        code: `export function f(a, b, c, v) { (a[b] as any)[c] = v; }`,
        errors: reported,
      },
    ],
  });
});
