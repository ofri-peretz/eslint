/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A READ cannot pollute a prototype. Executed, not argued.
 *
 * ```
 * const o = {}, k = '__proto__';
 * const v = o[k];          // Object.prototype unchanged
 * ```
 *
 * There is no key, no object, and no runtime in which evaluating `obj[k]` as an
 * expression writes anything. `benchmarks/rule-corpus/secure-coding__detect-object-injection/POLLUTION-FACTS.md`
 * carries the probe.
 *
 * ## Why this changes the rule
 *
 * Measured on 20 repositories, 3.10M lines: **14,910 findings across 4,286
 * distinct cases, of which 2,100 — 49.0% — are reads.** Half of everything this
 * rule says was provably incapable of the weakness it is named after.
 *
 * The rule's LOCK header allows exactly this: *"a new use case arrives WITH A
 * REPRODUCTION — code that is genuinely safe and reported, demonstrated by
 * RUNNING it."* That is the probe, and these are the cases.
 *
 * ## What is deliberately NOT claimed
 *
 * A read of an attacker-chosen key can still disclose something it should not
 * (`user[req.query.field]` handing back a password hash). That is CWE-200,
 * information exposure — a different weakness, a different rule, and a
 * different message. It is not prototype pollution, and reporting it under a
 * CWE-1321 message told the reader the wrong thing.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { detectObjectInjection } from './index';

const ruleTester = new RuleTester();

ruleTester.run('detect-object-injection — reads cannot pollute', detectObjectInjection, {
  valid: [
    {
      name: 'reading with a request-controlled key',
      code: `export function h(req, table) { return table[req.body.key]; }`,
    },
    {
      name: 'reading with a key that is literally __proto__',
      code: `export function h(o) { const k = '__proto__'; return o[k]; }`,
    },
    {
      name: 'array index in a loop — mongoose cast.js:62',
      code: `export function h(paths) { let path; for (let i = 0; i < paths.length; i++) { path = paths[i]; } return path; }`,
    },
    {
      name: 'config lookup by a computed key — mongoose cast.js:45',
      code: `export function h(obj, schema) { return obj[schema.options.discriminatorKey]; }`,
    },
    {
      name: 'a read used as a call argument',
      code: `export function h(req, table) { return JSON.stringify(table[req.query.k]); }`,
    },
    {
      name: 'a read on the right-hand side of an assignment',
      code: `export function h(req, src, dst) { dst.value = src[req.body.k]; return dst; }`,
    },
  ],
  invalid: [
    // CONTROLS. Writes still report — otherwise "reads are quiet" would pass on
    // a rule that had simply stopped working.
    {
      name: 'CONTROL: a write through a prototype reference still reports',
      code: `export function h(o, k, v) { o['__proto__'][k] = v; }`,
      errors: 1,
    },
    {
      name: 'CONTROL: a for-in copy loop still reports',
      code: `export function h(target, source) { for (const k in source) { target[k] = source[k]; } return target; }`,
      errors: 1,
    },
  ],
});
