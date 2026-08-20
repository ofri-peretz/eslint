/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Branches that only the WRITE path can reach, driven from real source.
 *
 * When reads stopped being reported on 2026-08-19, sixteen statements lost
 * their coverage. None of them were dead — every one is still live logic that
 * a write can reach — they had simply only ever been exercised through reads,
 * because reads were the loud path.
 *
 * That distinction cost a broken build. Two of the sixteen looked plainly dead:
 * an inner-chain skip and an assignment-left-side skip, both of whose `return`
 * statements no test reaches. Deleting them produced FIVE tests reporting extra
 * findings, because the CONDITIONS run constantly even though the returns do
 * not. **An uncovered line is not a dead line.**
 *
 * So every case here re-reaches a branch through a write instead, and each is
 * shaped after code that actually occurs in the 20-repository corpus rather
 * than invented to satisfy istanbul.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { detectObjectInjection } from './index';

const ruleTester = new RuleTester();

ruleTester.run('detect-object-injection — write-path branches', detectObjectInjection, {
  valid: [
    {
      // Nested `+` chains: the numeric-operand walk recurses into both sides.
      // webpack indexes buffers this way throughout.
      name: 'a deep arithmetic chain on both sides',
      code: `export function f(buf, a, b, c, v) { buf[a + b + (c + 1)] = v; }`,
    },
    {
      // A for-loop counter whose initialiser is itself numeric — the
      // declaration-inside-ForStatement branch.
      name: 'a for-loop counter declared in the loop head',
      code: `export function f(arr, v) { for (let i = 0; i < arr.length; i++) { arr[i] = v; } }`,
    },
    {
      name: 'a for-loop counter initialised from arithmetic',
      code: `export function f(arr, n, v) { for (let i = n - 1; i >= 0; i--) { arr[i] = v; } }`,
    },
    // NOT here: `keys.forEach((key) => { dst[key] = v })`. I expected that to be
    // quiet and the rule disagreed — correctly. If `keys` is
    // `Object.keys(req.body)` then the element IS attacker-chosen, and this is
    // mass assignment. My assumption that an iterated element is inherently safe
    // was wrong; safety depends on where the collection came from, which the
    // rule tracks and I did not.
    {
      name: 'an element bound by an array pattern in map',
      code: `export function f(src, dst) { Object.entries(src).map(([key, val]) => { dst[key] = val; }); }`,
    },
    // NOT here, deliberately: `forEach((item, i) => { dst[i] = v })`. The rule
    // reports it and should not — a callback's second parameter is a number by
    // language guarantee, the same kind of fact as "a read cannot pollute". It
    // occurs in the corpus. Putting it in `invalid` would LOCK the bug, so it is
    // recorded as a gap in SEAL.json and fixed as its own unit of work instead.
    {
      // Reflect metadata reached through a parenthesised optional chain — the
      // ChainExpression recursion arm.
      name: 'Reflect metadata via a parenthesised optional chain',
      code: `export function f(target, key, v) { const m = (Reflect.getMetadata?.('k', target))?.[key]; if (m) { m.x = v; } }`,
    },
    {
      // The const-allowlist resolver walks the scope chain and bails when the
      // binding has more than one definition.
      name: 'an allowlist binding declared twice is not a closed set',
      code: `var A = { a: 1 }; var A = other; export function f(req, o, v) { const k = A[req.body.k]; if (k) { o.safe = v; } }`,
    },
    {
      // `key in obj` as the guard — the in-operator arm.
      name: 'a key guarded by the in operator, written',
      code: `export function f(o, key, v) { if (key in o) { o[key] = v; } }`,
    },
    {
      // A guard block that RETURNS rather than throws.
      name: 'a guard block that returns early',
      code: `export function f(o, key, v) { if (!Object.hasOwn(o, key)) { return; } o[key] = v; }`,
    },
    {
      // A guard block that THROWS — the other arm of the same check.
      name: 'a guard block that throws',
      code: `export function f(o, key, v) { if (!Object.hasOwn(o, key)) { throw new Error('bad key'); } o[key] = v; }`,
    },
    {
      // A ternary whose arms are both numeric: `arr[flag ? 0 : 1] = v`.
      name: 'a numeric ternary as the key',
      code: `export function f(arr, flag, v) { arr[flag ? 0 : 1] = v; }`,
    },
    {
      // A bare computed access as an expression statement: not a write, not
      // invoked. `isWriteTarget` climbs to the top and finds nothing.
      name: 'a bare computed access as a statement',
      code: `export function f(o, k) { o[k]; }`,
    },
    {
      // Reflect metadata through an optional chain, WRITTEN through — the
      // ChainExpression recursion arm, which the read form no longer reaches.
      name: 'writing through a Reflect optional chain',
      code: `export function f(target, key, v) { Reflect.getMetadata?.('k', target)[key].x = v; }`,
    },
    {
      // `delete obj[key]` — a write in the sense that matters, and the branch
      // that handles it. Cache eviction all over the corpus.
      name: 'delete through a guarded key',
      code: `export function f(cache, key) { if (Object.hasOwn(cache, key)) { delete cache[key]; } }`,
    },
    {
      // A `for…in` key reused from an outer declaration has more than one
      // definition, so the allowlist resolver refuses it rather than guessing.
      name: 'a key whose binding has two definitions is not a closed set',
      code: `let k; export function f(o, src, v) { for (k in src) { o.safe = v; } }`,
    },
    {
      // A member-expression callee that is not one of the element-first
      // iterators — the ELEMENT_FIRST_ITERATORS membership bail-out.
      name: 'a non-iterator method call around a write',
      code: `export function f(rows, dst, v) { rows.reduceRight((acc, row) => { dst.safe = v; return acc; }, null); }`,
    },
    {
      // UpdateExpression on a computed member — `counts[key]++`. A write, and
      // the shape n8n and mongoose both use for tallies.
      name: 'an increment through a guarded key',
      code: `export function f(counts, key) { if (Object.hasOwn(counts, key)) { counts[key]++; } }`,
    },
  ],
  invalid: [
    {
      // The declarator has no initialiser, so the numeric-key check cannot prove
      // `i` is a number and falls through to the generic path. The rule reports.
      //
      // Consistent with the existing suite, which pins the same behaviour for a
      // pre-declared `for…in` key and calls it deliberate rather than a hole:
      // proving a counter numeric from a separated declaration needs flow
      // analysis this rule does not have (L3). Recorded, not silently accepted.
      name: 'an uninitialised counter declared before the loop still reports',
      code: `export function f(arr, v) { let i; for (i = 0; i < arr.length; i++) { arr[i] = v; } }`,
      errors: 1,
    },
    {
      // A destructured element is not inherently safe: `rows` may be parsed
      // request data, in which case `id` is attacker-chosen. The rule reports,
      // and the `bindsName` bail-out is what gets it there.
      name: 'an iterator callback binding an object pattern still reports',
      code: `export function f(rows, dst) { rows.forEach(({ id, value }) => { dst[id] = value; }); }`,
      errors: 1,
    },
    {
      // The key is itself a lookup into a name with TWO definitions, so the
      // allowlist resolver cannot claim a closed key space and declines.
      // `var A = {…}; var A = other;` — legal, and it means the first
      // declaration proves nothing about what `A` holds at the write.
      name: 'a key read from a twice-declared allowlist still reports',
      code: `var A = { a: 'A' }; var A = other; export function f(req, o, v) { const t = A[req.body.s]; o[t] = v; }`,
      errors: 1,
    },
    {
      // A ternary with one non-numeric arm is NOT numeric — the other side of
      // the same branch, and it reports.
      name: 'a ternary with a non-numeric arm still reports',
      code: `export function f(arr, flag, k, v) { arr[flag ? 0 : k] = v; }`,
      errors: 1,
    },
    {
      // `const h = handlers[k]; use(h);` — `h` IS referenced inside a call, but
      // as an ARGUMENT, not the callee. Passing a value to a function is not
      // invoking it, so this is a plain read and only the write below reports.
      name: 'a bound read passed as a call argument is not an invoked read',
      code: `export function f(handlers, k, o, v) { const h = handlers[k]; use(h); o[k] = v; }`,
      errors: 1,
    },
    {
      // `const h = handlers[k]` where `h` is never called: not an invoked read,
      // so nothing reports for the read — but the WRITE below it does.
      name: 'a bound read that is never called does not save the write',
      code: `export function f(handlers, k, o, v) { const h = handlers[k]; o[k] = v; return h; }`,
      errors: 1,
    },
    {
      // A callback binding used as a key where the method is NOT an
      // element-first iterator: `sort((a, b) => …)` binds comparands, not
      // elements, so `a` carries none of the provenance `forEach` would give
      // it. The membership bail-out is what gets us here, and reporting is
      // right — I expected quiet and was wrong.
      name: 'a sort comparand used as a key still reports',
      code: `export function f(rows, dst, v) { rows.sort((a, b) => { dst[a] = v; return 0; }); }`,
      errors: 1,
    },
    {
      // A chained computed WRITE. `checkMemberExpression` visits the inner
      // `o[a]`, which IS on a write path, reaches the inner-chain guard and
      // returns — one defect, one finding, reported on the outer link.
      name: 'a chained computed write reports once, not twice',
      code: `export function f(o, a, b, v) { o[a][b] = v; }`,
      errors: 1,
    },
    {
      // CONTROL for the increment: same shape, no guard.
      name: 'CONTROL: an increment through an unguarded key reports',
      code: `export function f(counts, key) { counts[key]++; }`,
      errors: 1,
    },
    {
      // CONTROL for the forEach branch: the key is the request, not the index.
      name: 'CONTROL: forEach whose key is request data still reports',
      code: `export function f(req, src, dst) { src.forEach((item) => { dst[req.body.k] = item; }); }`,
      errors: 1,
    },
    {
      // CONTROL for the arithmetic branch: concatenation is not arithmetic, and
      // a request value in it is a real key.
      name: 'CONTROL: string concatenation with request data still reports',
      code: `export function f(req, o, v) { o['p' + req.body.k] = v; }`,
      errors: 1,
    },
  ],
});
