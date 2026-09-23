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

ruleTester.run(
  'detect-object-injection — write-path branches',
  detectObjectInjection,
  {
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
      {
        // CONTROL for the reassignment fix below: an ordinary counter, never
        // written to inside the body, must stay silent. The all-writes scan
        // clears it on its numeric initialiser, exactly as the removed
        // loop-counter shortcut used to.
        name: 'a nested pair of loop counters with no reassignment stays silent',
        code: `export function f(g, v) { for (let i = 0; i < 3; i++) { for (let j = 0; j < 3; j++) { g[i][j] = v; } } }`,
      },
      // NOT here: `keys.forEach((key) => { dst[key] = v })`. I expected that to be
      // quiet and the rule disagreed — correctly. If `keys` is
      // `Object.keys(req.body)` then the element IS attacker-chosen, and this is
      // mass assignment. My assumption that an iterated element is inherently safe
      // was wrong; safety depends on where the collection came from, which the
      // rule tracks and I did not.
      {
        // The ArrayPattern `bindsName` branch, reached through a READ back out of
        // the object being iterated. That is the shape corpus fixture
        // `safe/07-object-keys-foreach.js` pins: `key` is an own enumerable key
        // of `src`, so the read cannot reach an inherited property.
        name: 'an element bound by an array pattern in map, read from the iterated object',
        code: `export function f(src) { let t = 0; Object.entries(src).map(([key]) => { t += src[key]; }); return t; }`,
      },
      // The gap this file recorded on 2026-09-13 as "NOT here, deliberately"
      // — `forEach((item, i) => { dst[i] = v })` — closed 2026-09-21. A
      // callback's index argument is `𝔽(k)` by ECMA-262, the same kind of fact
      // as "a read cannot pollute". The exemption is gated on the receiver
      // being provably an Array; the controls for that gate are below.
      {
        name: 'the index parameter of forEach is a number by language guarantee',
        code: `export function f(vals) { const out = []; const src = [].concat(vals); src.forEach((val, index) => { out[index] = val; }); return out; }`,
      },
      {
        name: 'the same guarantee through map',
        code: `export function f(vals) { const out = []; const src = Array.from(vals); src.map((val, i) => { out[i] = val; return val; }); return out; }`,
      },
      {
        name: 'a declared array type is provenance enough',
        code: `export function f(vals: number[]) { const out: number[] = []; vals.forEach((val, index) => { out[index] = val; }); return out; }`,
      },
      {
        name: 'reduce carries its index third, and that one is a number too',
        code: `export function f(vals: string[]) { return vals.reduce((acc, cur, index) => { acc[index] = cur; return acc; }, [] as string[]); }`,
      },
      {
        name: 'a readonly array annotation is provenance too',
        code: `export function f(vals: readonly number[]) { const out: number[] = []; vals.forEach((val, index) => { out[index] = val; }); return out; }`,
      },
      {
        name: 'the Array<T> spelling of the same annotation',
        code: `export function f(vals: Array<number>) { const out: number[] = []; vals.forEach((val, index) => { out[index] = val; }); return out; }`,
      },
      {
        name: 'a tuple annotation is an array annotation',
        code: `export function f(vals: [number, number]) { const out: number[] = []; vals.forEach((val, index) => { out[index] = val; }); return out; }`,
      },
      {
        name: 'a const bound to an array literal is provenance without an annotation',
        code: `export function f() { const xs = [1, 2]; const out: number[] = []; xs.forEach((val, index) => { out[index] = val; }); return out; }`,
      },
      {
        name: 'an array annotation on a const is provenance even when the initialiser is opaque',
        code: `declare function getThem(): number[]; export function f() { const xs: number[] = getThem(); const out: number[] = []; xs.forEach((val, index) => { out[index] = val; }); return out; }`,
      },
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
        /*
         * Reflect metadata through an optional chain, WRITTEN through — the
         * ChainExpression recursion arm, which the read form no longer reaches.
         *
         * The parentheses are required, not style. `a?.b[c].x = v` continues the
         * optional chain into the assignment target, which is an early error:
         * the code cannot run and this case was never the write it claimed to
         * be. typescript-eslint's parser accepts it anyway, so the test passed.
         * Parenthesising ends the chain and leaves a legal assignment whose
         * object is still a ChainExpression — the arm this is here to reach.
         */
        name: 'writing through a Reflect optional chain',
        code: `export function f(target, key, v) { (Reflect.getMetadata?.('k', target))[key].x = v; }`,
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
      // ── CONTROLS for the Array-iteration index exemption (2026-09-21) ─────
      // A quiet probe proves nothing without a positive control. Each of these
      // is one edit away from the exempted shape and must stay loud.
      //
      // Verified in Node 24: `new URLSearchParams('__proto__=x')
      // .forEach((v, k) => ...)` binds k === '__proto__' (a string). Map, Set,
      // Headers and FormData all pass a KEY in the slot where an Array passes
      // an index — which is why the exemption is gated on Array provenance and
      // not on the method name.
      {
        name: 'URLSearchParams forEach passes a key, not an index',
        code: `export function f(qs, dst) { new URLSearchParams(qs).forEach((v, k) => { dst[k] = v; }); }`,
        errors: [{ messageId: 'objectInjection' }],
      },
      {
        name: 'Map forEach passes a key, not an index',
        code: `export function f(m: Map<string, string>, dst) { m.forEach((v, k) => { dst[k] = v; }); }`,
        errors: [{ messageId: 'objectInjection' }],
      },
      {
        name: 'a receiver of unproven provenance is not an Array',
        code: `export function f(bag, dst) { bag.forEach((v, k) => { dst[k] = v; }); }`,
        errors: [{ messageId: 'objectInjection' }],
      },
      {
        name: 'parameter 0 is the element, and it stays loud',
        code: `export function f(entries: string[], store) { entries.forEach((key) => { store[key] = 1; }); }`,
        errors: [{ messageId: 'objectInjection' }],
      },
      {
        name: 'reduce parameter 1 is the element, not the index',
        code: `export function f(entries: string[]) { return entries.reduce((acc, k) => { acc[k] = 1; return acc; }, {}); }`,
        errors: [{ messageId: 'objectInjection' }],
      },
      {
        // A union is not an array type — the annotation says the value might
        // not be one, which is the opposite of stating provenance.
        name: 'a union annotation states no provenance',
        code: `export function f(vals: number[] | string[], dst) { vals.forEach((v, k) => { dst[k] = v; }); }`,
        errors: [{ messageId: 'objectInjection' }],
      },
      {
        // `readonly` over something that is not an array is still not an array.
        name: 'a keyof operator is not an array type',
        code: `export function f(vals: keyof Window, dst) { vals.forEach((v, k) => { dst[k] = v; }); }`,
        errors: [{ messageId: 'objectInjection' }],
      },
      {
        // A destructuring pattern binds a PIECE of the initializer, not the
        // initializer. `[someMap]` is an array literal; `vals` is the Map.
        // Reading provenance off the init would silence a live key.
        name: 'a destructured binding does not inherit the initializer provenance',
        code: `declare const someMap: Map<string, string>; const [vals] = [someMap]; export function f(dst) { vals.forEach((v, k) => { dst[k] = v; }); }`,
        errors: [{ messageId: 'objectInjection' }],
      },
      {
        name: 'a let can be reassigned between the declaration and the loop',
        code: `let vals = [1, 2]; export function f(dst) { vals.forEach((v, k) => { dst[k] = v; }); }`,
        errors: [{ messageId: 'objectInjection' }],
      },
      {
        name: 'a const with no initialiser states nothing',
        code: `declare const vals: unknown; export function f(dst) { vals.forEach((v, k) => { dst[k] = v; }); }`,
        errors: [{ messageId: 'objectInjection' }],
      },
      {
        name: 'an imported binding states nothing this file can read',
        code: `import { vals } from './m'; export function f(dst) { vals.forEach((v, k) => { dst[k] = v; }); }`,
        errors: [{ messageId: 'objectInjection' }],
      },
      {
        name: 'a computed callee names no method',
        code: `const m = 'forEach'; const xs = [1, 2]; export function f(dst) { xs[m]((v, k) => { dst[k] = v; }); }`,
        errors: [{ messageId: 'objectInjection' }],
      },
      {
        name: 'an unresolvable global receiver states nothing',
        code: `export function f(dst) { globalRegistry.forEach((v, k) => { dst[k] = v; }); }`,
        errors: [{ messageId: 'objectInjection' }],
      },
      {
        name: 'a twice-declared receiver has no single provenance',
        code: `var xs = [1, 2]; var xs = other; export function f(dst) { xs.forEach((v, k) => { dst[k] = v; }); }`,
        errors: [{ messageId: 'objectInjection' }],
      },
      {
        name: 'Array.isArray is not an array-producing call',
        code: `export function f(z, dst) { const xs = Array.isArray(z); xs.forEach((v, k) => { dst[k] = v; }); }`,
        errors: [{ messageId: 'objectInjection' }],
      },
      {
        name: 'a bare call states nothing about what it returns',
        code: `declare function makeList(): unknown; export function f(dst) { const xs = makeList(); xs.forEach((v, k) => { dst[k] = v; }); }`,
        errors: [{ messageId: 'objectInjection' }],
      },
      {
        // Two reports: the `src[m]` read is itself a computed access, and the
        // write keyed by `k` is not exempted because a computed callee names
        // no method to check provenance against.
        name: 'a computed method on the initialiser names nothing',
        code: `declare const src: any; declare const m: string; export function f(dst) { const xs = src[m](); xs.forEach((v, k) => { dst[k] = v; }); }`,
        errors: [
          { messageId: 'objectInjection' },
          { messageId: 'objectInjection' },
        ],
      },
      {
        name: 'a non-array annotation on a const states nothing',
        code: `declare const z: any; export function f(dst) { const xs: unknown = z; xs.forEach((v, k) => { dst[k] = v; }); }`,
        errors: [{ messageId: 'objectInjection' }],
      },
      {
        // Self-reference: following the initializer would recurse forever.
        name: 'a self-referential initialiser terminates rather than recursing',
        code: `const xs = xs; export function f(dst) { xs.forEach((v, k) => { dst[k] = v; }); }`,
        errors: [{ messageId: 'objectInjection' }],
      },
      {
        // MOVED FROM `valid` on 2026-09-13. This is the exact shape the comment
        // fifteen lines above declares IS mass assignment — "If `keys` is
        // `Object.keys(req.body)` then the element IS attacker-chosen, and this
        // is mass assignment." It sat in `valid` as a coverage fixture for the
        // ArrayPattern `bindsName` branch and, in doing so, locked the false
        // negative: `for (const [k,v] of Object.entries(src)) dst[k]=v` reported
        // while the `.map`/`.forEach` spelling of the same copy did not.
        // The branch it was covering is still covered, by the read-shaped case
        // above. burgee packages/burgee/src/yargs/utils.ts:98-101
        name: 'a copy onto another object, bound by an array pattern in map',
        code: `export function f(src, dst) { Object.entries(src).map(([key, val]) => { dst[key] = val; }); }`,
        errors: [{ messageId: 'massAssignment' }],
      },

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
        /**
         * burgee surfaced the FP direction of this; verification found the
         * real defect was the opposite one.
         *
         * `isLoopCounterIdentifier` returned true on the DECLARATION alone,
         * short-circuiting the all-writes scan, so a counter declared in the
         * for-head could be reassigned to an attacker-controlled value inside
         * the body and the write still cleared. The header forbids exactly
         * this: 'Suppress by resolving the key's declaration. Only with a
         * reassignment check.'
         *
         * The identical code with `let i` OUTSIDE the for-head already
         * reported, so spelling alone decided it.
         */
        name: 'a for-head counter reassigned from user input inside the body reports',
        code: `export function f(arr, req, v) { for (let i = 0; i < 3; i++) { i = req.query.k; arr[i] = v; } }`,
        errors: 1,
      },
      {
        // @found merge review (main's Array-index exemption met this branch's
        // reassignment fix). The same shortcut, one spelling over: ECMA-262
        // fixes the index the callee PASSES, not what the body writes over it.
        name: 'an Array-callback index parameter reassigned from user input inside the body reports',
        code: `export function f(vals, req) { const out = []; [].concat(vals).forEach((val, index) => { index = req.query.k; out[index] = val; }); return out; }`,
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
  },
);
