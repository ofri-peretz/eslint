/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * What each key- and object-shape proof clears, and the neighbouring shape it
 * must not clear. One case per claim; the pair is what makes it a lock.
 *
 * Two of these were false negatives until 2026-11: an opaque member step
 * (`o[k]`, `items[0]`) ended the CWE-1321 walk, so the prototype write behind it
 * was never called one.
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
const global = [{ messageId: 'globalPrototypeWrite' as const }];

describe('detect-object-injection — key and object shapes', () => {
  ruleTester.run('detect-object-injection', detectObjectInjection, {
    valid: [
      // ── array append ──
      {
        name: 'arr[arr.length] = x appends, whoever passed arr in',
        code: `export function f(arr, x) { arr[arr.length] = x; }`,
      },
      // ── literal affixes ──
      {
        name: 'a literal suffix no dangerous name ends with pins the key away from all of them',
        code: `export function f(o, k, v) { o[k + ':meta'] = v; }`,
      },
      {
        name: 'a template whose last part is a constant suffix is pinned by that suffix',
        code: `const SUFFIX = ':meta';\nexport function f(o, k, v) { o[\`\${k}\${SUFFIX}\`] = v; }`,
      },
      {
        name: 'a numeric literal prefix pins the key even when the numeric shortcut is off',
        code: `export function f(o, k, v) { o[2 + k] = v; }`,
        options: [{ dangerousProperties: ['Item'] }],
      },
      // ── numeric operands in a concatenation ──
      {
        name: 'a unary-plus operand inside a concatenation is a number',
        code: `export function f(o, k, n, v) { o[k + +n] = v; }`,
      },
      {
        name: 'a product inside a concatenation is a number',
        code: `export function f(o, k, a, b, v) { o[k + a * b] = v; }`,
      },
      // ── keys from a module array literal ──
      {
        name: 'a key read out of a module array literal is one of its literals',
        code: `const keys = ['a', 'b'];\nexport function f(o, i, v) { o[keys[i]] = v; }`,
      },
      // ── prototype writes ──
      {
        name: 'a write two steps past constructor, neither of them prototype, is not a prototype write',
        code: `export class A { reset() { this.constructor.registry.size = 0; } }`,
      },
      {
        name: 'a write to constructor.<other> is not a prototype write',
        code: `export function f(o) { o.constructor.displayName = 'X'; }`,
      },
      // ── updates and typed arrays ──
      {
        name: 'incrementing a typed-array slot writes a number into a buffer',
        code: `const buf = new Uint8Array(4);\nexport function f(k) { buf[k]++; }`,
      },
      {
        name: 'incrementing a slot named by a for-in key touches an existing own key',
        code: `export function f(o, src) { for (const key in src) { o[key]++; } }`,
      },
      // ── prototypeless holders ──
      {
        name: 'reassigning an unrelated binding leaves a prototypeless holder intact',
        code: `const H = { a: Object.create(null) };\nlet n = 0;\nn = 1;\nexport function f(k, v) { H.a[k] = v; }`,
      },
      {
        name: "writing the same property name on ANOTHER object leaves the holder's slot intact",
        code: `const H = { a: Object.create(null) };\nconst other = {};\nother.a = 1;\nexport function f(k, v) { H.a[k] = v; }`,
      },
      {
        name: 'reassigning a DIFFERENT slot of the holder leaves the prototypeless one intact',
        code: `const H = { a: Object.create(null), b: 1 };\nH.b = 2;\nexport function f(k, v) { H.a[k] = v; }`,
      },
      {
        name: 'an array hole elsewhere in the file does not disturb the holder scan',
        code: `const H = { a: Object.create(null) };\nconst arr = [1, , 2];\nexport function f(k, v) { H.a[k] = v; }`,
      },
    ],
    invalid: [
      {
        name: 'a key read off the object itself is not the array-append idiom',
        code: `export function f(o, v) { o[o.key] = v; }`,
        errors: reported,
      },
      {
        name: "a '__' suffix still ends a dangerous name, so it pins nothing",
        code: `export function f(o, k, v) { o[k + '__'] = v; }`,
        errors: reported,
      },
      {
        name: "a 'type' suffix still ends 'prototype', so it pins nothing",
        code: `export function f(o, k, v) { o[k + 'type'] = v; }`,
        errors: reported,
      },
      {
        name: 'an empty-string prefix pins nothing, even with no dangerous names listed',
        code: `export function f(o, k, v) { o['' + k] = v; }`,
        options: [{ dangerousProperties: [] }],
        errors: reported,
      },
      {
        name: 'a concatenation of three opaque values has no numeric operand',
        code: `export function f(o, a, b, k, v) { o[a + b + k] = v; }`,
        errors: reported,
      },
      {
        name: 'a mixed-case parameter used as a write key reports',
        code: `export function f(o, myKEY, v) { o[myKEY] = v; }`,
        errors: reported,
      },
      {
        name: 'an upper-case-led parameter used as a write key reports',
        code: `export function f(o, KEYs, v) { o[KEYs] = v; }`,
        errors: reported,
      },
      {
        name: 'a PascalCase parameter ending in Status used as a write key reports',
        code: `export function f(o, UserStatus, v) { o[UserStatus] = v; }`,
        errors: reported,
      },
      {
        name: 'a parameter with Type mid-name used as a write key reports',
        code: `export function f(o, itemTypeName, v) { o[itemTypeName] = v; }`,
        errors: reported,
      },
      {
        // @found mutation testing
        name: 'FN: a numeric step does not hide a constructor.prototype write',
        code: `export function f(items) { items[0].constructor.prototype.polluted = 1; }`,
        errors: global,
      },
      {
        // @found mutation testing
        name: 'FN: a dynamic step does not hide a __proto__ write',
        code: `export function f(o, k) { o[k].__proto__.polluted = 1; }`,
        errors: global,
      },
      {
        name: 'an invoked read off a plain call result is not a Reflect metadata read',
        code: `export function f(k) { return lookup()[k](); }`,
        errors: reported,
      },
      {
        name: 'an invoked read off another API method is not a Reflect metadata read',
        code: `export function f(api, k) { return api.get('x')[k](); }`,
        errors: reported,
      },
      {
        name: "another object's assign() is not Object.assign",
        code: `export function f(d, k, v, cfg) { const t = cfg.assign(Object.create(null), d); t[k] = v; }`,
        errors: reported,
      },
      {
        name: 'Object.assign() with no target proves nothing about the result',
        code: `export function f(k, v) { const t = Object.assign(); t[k] = v; }`,
        errors: reported,
      },
      {
        name: "another object's create(null) is not Object.create(null)",
        code: `export function f(k, v) { const t = Factory.create(null); t[k] = v; }`,
        errors: reported,
      },
      {
        name: 'Object.create() with no prototype argument is not Object.create(null)',
        code: `export function f(k, v) { const t = Object.create(); t[k] = v; }`,
        errors: reported,
      },
      {
        name: 'an array literal that does not start with a spread is an ordinary object',
        code: `export function f(k, v) { const t = [1]; t[k] = v; }`,
        errors: reported,
      },
      {
        name: 'an array literal starting with a hole is an ordinary object',
        code: `export function f(k, v) { const t = [, 1]; t[k] = v; }`,
        errors: reported,
      },
    ],
  });
});
