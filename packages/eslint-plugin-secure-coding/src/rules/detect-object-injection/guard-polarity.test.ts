/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A guard clears a write only in the branch it ADMITS.
 *
 * `hasPrecedingValidation` unwrapped `!` and threw the polarity away, so a
 * write reached only by a key the allowlist REJECTS counted as guarded:
 *
 *   if (!ALLOWED.includes(k)) { o[k] = v; }      // silent, writes every bad key
 *   if (ALLOWED.includes(k)) return; o[k] = v;   // silent, same
 *
 * The rest of this file pins what each guard spelling does and does not prove
 * — which key, which object, which call — case by case.
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

const ALLOWED = `const ALLOWED = ['name', 'email'];\n`;
const reported = [{ messageId: 'objectInjection' as const }];

describe('detect-object-injection — a guard clears only the branch it admits', () => {
  ruleTester.run('detect-object-injection', detectObjectInjection, {
    valid: [
      {
        name: 'the write in the ELSE of a negated allowlist check is guarded',
        code: `${ALLOWED}export function f(o, k, v) { if (!ALLOWED.includes(k)) { log(k); } else { o[k] = v; } }`,
      },
      {
        name: 'the write inside a positive allowlist check is guarded',
        code: `${ALLOWED}export function f(o, k, v) { if (ALLOWED.includes(k)) { o[k] = v; } }`,
      },
      {
        name: 'an early-exit block may do other work before it returns',
        code: `${ALLOWED}export function f(o, k, v) { if (!ALLOWED.includes(k)) { log(k); return; } o[k] = v; }`,
      },
      {
        name: 'a guard clause at the top of a function expression covers its body',
        code: `${ALLOWED}export const f = function (o, k, v) { if (!ALLOWED.includes(k)) return; o[k] = v; };`,
      },
      {
        name: 'a guard clause at the top of an arrow function covers its body',
        code: `${ALLOWED}export const f = (o, k, v) => { if (!ALLOWED.includes(k)) return; o[k] = v; };`,
      },
      {
        name: 'o.hasOwnProperty(k) guards a write through o',
        code: `export function f(o, k, v) { if (o.hasOwnProperty(k)) { o[k] = v; } }`,
      },
      {
        name: 'hasOwnProperty.call(o, k) guards a write through o',
        code: `export function f(o, k, v) { if (Object.prototype.hasOwnProperty.call(o, k)) { o[k] = v; } }`,
      },
      {
        name: 'a negated Object.hasOwn guard clause covers the write after it',
        code: `export function f(o, k, v) { if (!Object.hasOwn(o, k)) return; o[k] = v; }`,
      },
      {
        name: '`k in o` guards a write through o',
        code: `export function f(o, k, v) { if (k in o) { o[k] = v; } }`,
      },
    ],
    invalid: [
      {
        name: 'BUG: a write inside a NEGATED allowlist check is reached only by rejected keys',
        code: `${ALLOWED}export function f(o, k, v) { if (!ALLOWED.includes(k)) { o[k] = v; } }`,
        errors: reported,
      },
      {
        name: 'BUG: returning when the key IS allowed leaves the write to the rejected ones',
        code: `${ALLOWED}export function f(o, k, v) { if (ALLOWED.includes(k)) return; o[k] = v; }`,
        errors: reported,
      },
      {
        name: 'BUG: the guard statement that holds the write is not a guard before it',
        code: `${ALLOWED}export function f(o, k, v) { if (!ALLOWED.includes(k)) { o[k] = v; return; } }`,
        errors: reported,
      },
      {
        name: 'a negated check whose block does not leave the function guards nothing after it',
        code: `${ALLOWED}export function f(o, k, v) { if (!ALLOWED.includes(k)) { log(k); } o[k] = v; }`,
        errors: reported,
      },
      {
        name: 'a negated check whose single statement does not leave guards nothing after it',
        code: `${ALLOWED}export function f(o, k, v) { if (!ALLOWED.includes(k)) log(k); o[k] = v; }`,
        errors: reported,
      },
      {
        name: 'an arrow with an expression body has no guard clause to find',
        code: `export const set = (o, k, v) => (o[k] = v);`,
        errors: reported,
      },
      {
        name: "an outer function's guard does not cover a nested function's own parameter of the same name",
        code: `${ALLOWED}export function outer(o, k, v) { if (!ALLOWED.includes(k)) return; const inner = (k) => { o[k] = v; }; inner(v); }`,
        errors: reported,
      },
      {
        name: 'a Map lookup is not a membership guard',
        code: `export function f(o, k, v, cache) { if (cache.get(k)) { o[k] = v; } }`,
        errors: reported,
      },
      {
        name: 'includes() with no argument tests nothing about the key',
        code: `export function f(o, k, v, list) { if (list.includes()) { o[k] = v; } }`,
        errors: reported,
      },
      {
        name: 'an allowlist check on a DIFFERENT variable does not guard the key',
        code: `${ALLOWED}export function f(o, k, v, other) { if (ALLOWED.includes(other)) { o[k] = v; } }`,
        errors: reported,
      },
      {
        name: 'an unknown two-argument method naming the object and key is not an ownership check',
        code: `export function f(o, k, v, rules) { if (rules.allows(o, k)) { o[k] = v; } }`,
        errors: reported,
      },
      {
        name: 'a one-argument .call is not hasOwnProperty.call',
        code: `export function f(o, k, v, check) { if (check.call(k)) { o[k] = v; } }`,
        errors: reported,
      },
      {
        name: 'hasOwnProperty.call naming a DIFFERENT key does not guard',
        code: `export function f(o, k, v, other) { if (Object.prototype.hasOwnProperty.call(o, other)) { o[k] = v; } }`,
        errors: reported,
      },
      {
        name: 'an arbitrary one-argument method on the written object is not hasOwnProperty',
        code: `export function f(o, k, v) { if (o.isValid(k)) { o[k] = v; } }`,
        errors: reported,
      },
      {
        name: 'Object.hasOwn with no key argument does not guard',
        code: `export function f(o, k, v) { if (Object.hasOwn(o)) { o[k] = v; } }`,
        errors: reported,
      },
      {
        name: 'a comparison of the key is not a membership test',
        code: `export function f(o, k, v) { if (k !== '') { o[k] = v; } }`,
        errors: reported,
      },
      {
        name: '`other in o` does not guard the key k',
        code: `export function f(o, k, v, other) { if (other in o) { o[k] = v; } }`,
        errors: reported,
      },
      {
        name: 'a private brand check `#k in o` is not a test of the variable k',
        code: `export class C { #k = 1; m(o, k, v) { if (#k in o) { o[k] = v; } } }`,
        errors: reported,
      },
    ],
  });
});
