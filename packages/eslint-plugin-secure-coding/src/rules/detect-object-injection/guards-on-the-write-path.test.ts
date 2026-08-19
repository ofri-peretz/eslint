/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Every safe-key guard, exercised on the WRITE path.
 *
 * When reads stopped being reported on 2026-08-19, roughly two dozen statements
 * went uncovered — the Symbol-key check, the Reflect-metadata chain, the
 * `hasOwnProperty` matcher, the dangerous-property prefix/suffix comparison.
 * Coverage falling looked like the change had orphaned them.
 *
 * It had not. Those guards are reachable from writes too — `obj[Symbol.iterator]
 * = fn` is as much a computed write as `obj[userKey] = v` — they were simply
 * only ever TESTED through reads, because reads were the loudest path. So this
 * file re-exercises each one in its write form rather than deleting logic that
 * still runs.
 *
 * The distinction matters: deleting a guard because its test disappeared would
 * have quietly turned four safe shapes into findings.
 *
 * Every case here pairs a guard (must stay quiet) with a control (must report),
 * so "quiet" cannot pass on a rule that has stopped working.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { detectObjectInjection } from './index';

const ruleTester = new RuleTester();

ruleTester.run('detect-object-injection — guards, on the write path', detectObjectInjection, {
  valid: [
    {
      name: 'a Symbol key, written',
      code: `const kTag = Symbol('tag'); export function f(o, v) { o[kTag] = v; }`,
    },
    {
      name: 'Symbol.for, written',
      code: `const kTag = Symbol.for('tag'); export function f(o, v) { o[kTag] = v; }`,
    },
    {
      name: 'a well-known Symbol, written',
      code: `export function f(o, v) { o[Symbol.iterator] = v; }`,
    },
    {
      name: 'a numeric index, written',
      code: `export function f(arr, v) { for (let i = 0; i < arr.length; i++) { arr[i] = v; } }`,
    },
    {
      name: 'a key guarded by Object.hasOwn on the SAME identifier, written',
      code: `export function f(o, key, v) { if (Object.hasOwn(o, key)) { o[key] = v; } }`,
    },
    {
      name: 'a key guarded by hasOwnProperty.call on the SAME identifier, written',
      code: `export function f(o, key, v) { if (Object.prototype.hasOwnProperty.call(o, key)) { o[key] = v; } }`,
    },
    {
      name: 'a key from a const allowlist, written',
      code: `const ALLOWED = { a: 'a', b: 'b' }; export function f(req, o, v) { const k = ALLOWED[req.body.k]; if (k) { o[k] = v; } }`,
    },
    {
      // `arr[i + 1] = v` — pagination and buffer arithmetic all over the corpus.
      name: 'arithmetic over numeric operands, written',
      code: `export function f(arr, i, v) { arr[i + 1] = v; }`,
    },
    {
      name: 'a nested arithmetic chain, written',
      code: `export function f(arr, i, j, v) { arr[i + j + 2] = v; }`,
    },
    {
      // webpack and mongoose both index with Math.* results.
      name: 'a Math.* result as the key, written',
      code: `export function f(arr, n, v) { arr[Math.floor(n / 2)] = v; }`,
    },
    {
      name: 'Number()/parseInt as the key, written',
      code: `export function f(arr, s, v) { arr[Number(s)] = v; arr[parseInt(s, 10)] = v; }`,
    },
    {
      // The CommonJS half of the imported-binding guard — the corpus is mostly
      // CJS, and an ESM-only version of this check once shipped doing nothing.
      //
      // The binding must BE the require call. `require('./c').FIELD` is not
      // recognised, and that is left alone deliberately: the shape appears in 4
      // files across 3.10M lines, all of them webpack's own test fixtures, and
      // in none of them is it ever used as a computed write key. Widening the
      // guard for it would be a feature measured against nothing.
      name: 'a key bound by require(), written',
      code: `const M = require('./constants'); export function f(o, v) { o[M] = v; }`,
    },
    {
      name: 'an ESM imported binding as the key, written',
      code: `import { FIELD } from './constants'; export function f(o, v) { o[FIELD] = v; }`,
    },
    {
      // The dangerous-property comparison on a CONCATENATED key: neither half
      // can prefix or suffix any of __proto__/constructor/prototype.
      name: 'a concatenated key that cannot spell a dangerous property, written',
      code: `export function f(o, id, v) { o['user_' + id] = v; }`,
    },
    {
      name: 'Reflect metadata through an optional chain, written',
      code: `export function f(target, key, v) { const m = Reflect.getMetadata('k', target)?.[key]; if (m) { m.x = v; } }`,
    },
  ],
  invalid: [
    // CONTROLS — the same shapes with the guard removed or mismatched. Without
    // these, every case above would pass on a rule that reports nothing at all.
    {
      name: 'CONTROL: no Symbol, no guard — reports',
      code: `export function f(o, key, v) { o[key] = v; }`,
      errors: 1,
    },
    {
      name: 'CONTROL: hasOwn naming a DIFFERENT key does not guard',
      code: `export function f(o, key, other, v) { if (Object.hasOwn(o, other)) { o[key] = v; } }`,
      errors: 1,
    },
    {
      name: 'CONTROL: a Symbol binding reassigned to a string is no longer a Symbol',
      code: `let k = Symbol('t'); k = 'polluted'; export function f(o, v) { o[k] = v; }`,
      errors: 1,
    },
    {
      // My expectation was wrong here, not the rule. The Reflect guard exempts
      // READING decorator metadata — introspection a framework does to itself.
      // Writing THROUGH that result mutates whatever object the metadata handed
      // back, which is the ordinary computed-write risk and nothing to do with
      // introspection. Moved from `valid` after the rule disagreed.
      name: 'writing through a Reflect metadata result is still a write',
      code: `export function f(target, key, v) { Reflect.getMetadata('design:type', target)[key] = v; }`,
      errors: 1,
    },
    {
      name: 'CONTROL: a non-Reflect call result written through',
      code: `export function f(target, key, v) { getMetadata(target)[key] = v; }`,
      errors: 1,
    },
  ],
});
