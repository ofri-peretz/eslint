/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Proofs the rule already had, applied where it had not been taking them.
 *
 * A sweep over the NestJS packages (2026-11-25, 240 findings) found three
 * spellings of code the rule already proves safe elsewhere:
 *
 *  - `Object.values(x).forEach((v, i) => d[i] = v)`: `i` is an Array index,
 *    and the Object listing statics return an Array for any argument.
 *  - `for (const [lo, hi] of PAIRS)` over a const list of string tuples: every
 *    value `hi` takes is spelled in the file, as for `for (const k of KEYS)`.
 *  - `delete o[k]` and `o[k]()` over a literal list: the assignment path took
 *    the literal-list proof, the delete and invoked-read path did not.
 *
 * The Quint model's Delete position added a fourth: `delete o[k]` on an
 * `Object.create(null)` object reported, though `o[k] = v` on it did not
 * (SPEC G1 exempts a prototypeless target).
 *
 * Each proof still fails closed: a `__proto__` in the list, a default or a
 * spread that brings a value from elsewhere, and a Map's string key all report.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { detectObjectInjection } from './index';

const ruleTester = new RuleTester();

ruleTester.run(
  'detect-object-injection — NestJS sweep proofs',
  detectObjectInjection,
  {
    valid: [
      {
        // @found NestJS sweep 2026-11-25, nest packages/platform-express/multer/multer/multer.utils.ts:236
        name: 'FP: the index of Object.values(x).forEach through a const',
        code: 'export function f(container) { const values = Object.values(container); values.forEach((value, index) => (container[index] = value)); }',
      },
      {
        // @found reasoned from multer.utils.ts:236 (NestJS sweep 2026-11-25), not seen in real code
        name: 'FP: the index of an inline Object.keys(x).forEach',
        code: 'export function f(o, d) { Object.keys(o).forEach((k, i) => { d[i] = k; }); }',
      },
      {
        // @found reasoned from multer.utils.ts:236 (NestJS sweep 2026-11-25), not seen in real code
        name: 'FP: the index of Object.entries(x).map',
        code: 'export function f(o, d) { Object.entries(o).map((e, i) => { d[i] = e; }); }',
      },
      {
        // @found reasoned from multer.utils.ts:236 (NestJS sweep 2026-11-25), not seen in real code
        name: 'FP: the index of Object.getOwnPropertyNames(x).forEach',
        code: 'export function f(o, d) { Object.getOwnPropertyNames(o).forEach((k, i) => { d[i] = k; }); }',
      },
      {
        // @found NestJS sweep 2026-11-25, nest swagger lib/utils/nullable-to-oas31.util.ts:126
        name: 'FP: a binding destructured from a const list of string tuples',
        code: "const PAIRS = [['exclusiveMinimum', 'minimum'], ['exclusiveMaximum', 'maximum']] as const; export function f(schema) { for (const [x, y] of PAIRS) { schema[x] = schema[y]; } }",
      },
      {
        // @found reasoned from nullable-to-oas31.util.ts:126 (NestJS sweep 2026-11-25), not seen in real code
        name: 'FP: the second slot of a tuple list wrapped in Object.freeze',
        code: "const PAIRS = Object.freeze([['a', 'b'], ['c', 'd']]); export function f(schema, v) { for (const [, y] of PAIRS) { schema[y] = v; } }",
      },
      {
        // @found NestJS sweep 2026-11-25, nest swagger lib/utils/nullable-to-oas31.util.ts:127
        name: 'FP: delete over a binding from a const list of string tuples',
        code: "const PAIRS = [['exclusiveMinimum', 'minimum']] as const; export function f(schema) { for (const [x, y] of PAIRS) { delete schema[y]; } }",
      },
      {
        // @found NestJS sweep 2026-11-25, nest swagger lib/plugin/merge-options.ts:85
        name: 'FP: delete over an inline list of string literals',
        code: "export function f(options) { for (const key of ['dtoFileNameSuffix', 'controllerFileNameSuffix']) { delete options[key]; } }",
      },
      {
        // @found NestJS sweep 2026-11-25, nest observe src/services/stdout-forwarder.service.ts:259
        name: 'FP: a method reached through a const list of names',
        code: "const STREAMS = ['stdout', 'stderr'] as const; export function f(target) { for (const name of STREAMS) { target[name](); } }",
      },
      {
        // @found mutation testing (oxmutate, 2026-11-25)
        name: 'FP: the index of a split() result iterated inline',
        code: "export function f(s, d) { s.split(',').forEach((v, i) => { d[i] = v; }); }",
      },
      {
        // @found Quint fidelity model (detect_object_injection.qnt), Delete position
        name: 'FP: delete on an Object.create(null) object',
        code: 'export function f(userKey) { const obj = Object.create(null); delete obj[userKey]; return obj; }',
      },
    ],
    invalid: [
      {
        // @found mutation testing (oxmutate, 2026-11-25)
        name: 'FN guard: a spread before the bound slot moves a __proto__ into it',
        code: "const P = ['x', '__proto__']; const PAIRS = [[...P, 'b']]; export function f(schema, v) { for (const [, y] of PAIRS) { schema[y] = v; } }",
        errors: [{ messageId: 'objectInjection' }],
      },
      {
        // @found mutation testing (oxmutate, 2026-11-25)
        name: 'FN guard: a hole in the list of tuples',
        code: "const PAIRS = [, ['a', 'b']]; export function f(schema, v) { for (const [, y] of PAIRS) { schema[y] = v; } }",
        errors: [{ messageId: 'objectInjection' }],
      },
      {
        // @found mutation testing (oxmutate, 2026-11-25)
        name: 'FN guard: a hole in the bound slot of a tuple',
        code: "const PAIRS = [['a', , 'c']]; export function f(schema, v) { for (const [, y] of PAIRS) { schema[y] = v; } }",
        errors: [{ messageId: 'objectInjection' }],
      },
      {
        // @found mutation testing (oxmutate, 2026-11-25)
        name: 'FN guard: a slot past the end of every tuple',
        code: "const PAIRS = [['a', 'b']]; export function f(schema, v) { for (const [, , z] of PAIRS) { schema[z] = v; } }",
        errors: [{ messageId: 'objectInjection' }],
      },
      {
        // @found reasoned from multer.utils.ts:236 (NestJS sweep 2026-11-25), not seen in real code
        name: 'FN guard: a Map forEach passes a string key, not an index',
        code: 'export function f(m, d) { const bag = new Map(); bag.forEach((v, k) => { d[k] = v; }); }',
        errors: [{ messageId: 'objectInjection' }],
      },
      {
        // @found reasoned from multer.utils.ts:236 (NestJS sweep 2026-11-25), not seen in real code
        name: 'FN guard: a non-listing Object static is not an Array',
        code: 'export function f(o, d) { Object.fromEntries(o).forEach((v, k) => { d[k] = v; }); }',
        errors: [{ messageId: 'objectInjection' }],
      },
      {
        // @found reasoned from nullable-to-oas31.util.ts:126 (NestJS sweep 2026-11-25), not seen in real code
        name: 'FN guard: a tuple list that spells __proto__ in the bound slot',
        code: "const PAIRS = [['a', '__proto__'], ['c', 'd']] as const; export function f(schema, v) { for (const [x, y] of PAIRS) { schema[y] = v; } }",
        errors: [{ messageId: 'objectInjection' }],
      },
      {
        // @found reasoned from nullable-to-oas31.util.ts:126 (NestJS sweep 2026-11-25), not seen in real code
        name: 'FN guard: a default supplies the bound value from elsewhere',
        code: "const PAIRS = [['a', 'b']] as const; export function f(schema, v, k) { for (const [x = k] of PAIRS) { schema[x] = v; } }",
        errors: [{ messageId: 'objectInjection' }],
      },
      {
        // @found reasoned from nullable-to-oas31.util.ts:126 (NestJS sweep 2026-11-25), not seen in real code
        name: 'FN guard: a spread in a tuple shifts the bound slot',
        code: "const P = ['__proto__']; const PAIRS = [[...P, 'a']]; export function f(schema, v) { for (const [x] of PAIRS) { schema[x] = v; } }",
        errors: [{ messageId: 'objectInjection' }],
      },
      {
        // @found reasoned from nullable-to-oas31.util.ts:126 (NestJS sweep 2026-11-25), not seen in real code
        name: 'FN guard: a nested pattern is not read as a slot',
        code: "const PAIRS = [['a', 'b']]; export function f(schema, v) { for (const [[x]] of PAIRS) { schema[x] = v; } }",
        errors: [{ messageId: 'objectInjection' }],
      },
      {
        // @found reasoned from nullable-to-oas31.util.ts:126 (NestJS sweep 2026-11-25), not seen in real code
        name: 'FN guard: a whole tuple used as the key',
        code: "const PAIRS = [['a', 'b']]; export function f(schema, v) { for (const p of PAIRS) { schema[p] = v; } }",
        errors: [{ messageId: 'objectInjection' }],
      },
      {
        // @found reasoned from merge-options.ts:85 (NestJS sweep 2026-11-25), not seen in real code
        name: 'FN guard: delete over a list that spells __proto__',
        code: "export function f(o) { for (const k of ['a', '__proto__']) { delete o[k]; } }",
        errors: [{ messageId: 'objectInjection' }],
      },
      {
        // @found reasoned from stdout-forwarder.service.ts:259 (NestJS sweep 2026-11-25), not seen in real code
        name: 'FN guard: a method reached through a list that spells constructor',
        code: "export function f(o) { for (const k of ['start', 'constructor']) { o[k](); } }",
        errors: [{ messageId: 'objectInjection' }],
      },
    ],
  },
);
