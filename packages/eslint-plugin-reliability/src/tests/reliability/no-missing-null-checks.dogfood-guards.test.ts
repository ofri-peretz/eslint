/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * no-missing-null-checks: guards the rule did not read, found by linting the
 * source of Vite, NestJS, ESLint, Fastify, Express and Hono.
 *
 * Each VALID case is the smallest form of a shape that a maintainer of those
 * projects had written correctly and the rule reported anyway:
 *
 *   while (m) { m[1] }              a loop test guards its body
 *   if (m) { m[1].length }          a truthy guard covers a computed link
 *   !c || c.range[1] > 1            the right side of `||` runs only when `!c` was false
 *   Boolean(b) && b.type            same guard, spelled as a call
 *   a && a.b && a.b.c               the guard sits in a left-nested `&&` chain
 *   if (!r) fail('x'); r.index      `fail(): never` cannot fall through
 *   let info = null; function read() { info.x }  + a later write in another closure
 *   const [, a] = line.match(re)    an element is not the container
 *   while (q.length) { q.pop().x }  a length check proves the pop has a value
 *
 * Every INVALID case is a lookalike that must still report, so the new
 * understanding cannot become a blanket silence.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect, afterAll } from 'vitest';
import { Linter } from 'eslint';
import parser from '@typescript-eslint/parser';
import {
  noMissingNullChecks,
  hasNullCheck,
} from '../../rules/reliability/no-missing-null-checks';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

const PRELUDE = `declare const s: string;
declare const xs: any[];
declare function use(x: unknown): void;
`;

const miss = [{ messageId: 'missingNullCheck' as const }];

ruleTester.run('no-missing-null-checks (dogfood guards)', noMissingNullChecks, {
  valid: [
    {
      name: 'a while test guards its body (hono url.ts, fastify content-type.js)',
      code: `${PRELUDE}const m = /a(b)/.exec(s);
while (m) { use(m[1]); break; }`,
    },
    {
      name: 'a for test guards its body',
      code: `${PRELUDE}const m = /a(b)/.exec(s);
for (; m; ) { use(m[1]); break; }`,
    },
    {
      name: 'a truthy guard covers a computed link, not only a dotted one',
      code: `${PRELUDE}const m = /a(b)/.exec(s);
if (m) { m[1].length; }`,
    },
    {
      name: '`!x || x.y` — the right side runs only when x was truthy',
      code: `${PRELUDE}const c = xs.pop();
const v = !c || c.range[1] > 1;`,
    },
    {
      name: '`x == null || x.y`',
      code: `${PRELUDE}const c = xs.pop();
const v = c == null || c.range[1] > 1;`,
    },
    {
      name: '`Boolean(x) && x.y`',
      code: `${PRELUDE}const b = xs.pop();
const v = Boolean(b) && b.type;`,
    },
    {
      name: '`x != null && x.y` excludes both null and undefined',
      code: `${PRELUDE}const w = xs.find((r) => r);
const z = w != null && w.id;`,
    },
    {
      name: 'both strict inequalities together exclude null and undefined',
      code: `${PRELUDE}const w = xs.find((r) => r);
const z = w !== null && w !== undefined && w.id;`,
    },
    {
      name: 'the strict pair in either operand order',
      code: `${PRELUDE}const w = xs.find((r) => r);
const z = undefined !== w && null !== w && w.id;`,
    },
    {
      name: 'the guard sits on the left of a longer `&&` chain',
      code: `${PRELUDE}const ref = xs.find((r) => r);
const v = ref && ref.resolved && ref.resolved.scope;`,
    },
    {
      name: 'the guard is one conjunct of a left-nested `&&`',
      code: `${PRELUDE}const m = /a(b)/.exec(s);
const v = m && s.length && m[1];`,
    },
    {
      name: 'a function declared `: never` ends the branch (vite css.ts shape)',
      code: `declare function fail(msg: string): never;
declare const s: string;
const r = /a/.exec(s);
if (!r) fail('x');
r.index;`,
    },
    {
      name: 'a block that calls a local `never` function ends the branch',
      code: `function bail(msg: string): never { throw new Error(msg); }
declare const s: string;
const r = /a/.exec(s);
if (!r) { bail('no match'); }
r.index;`,
    },
    {
      name: '`process.exit()` ends the branch',
      code: `declare const s: string;
const r = /a/.exec(s);
if (!r) process.exit(1);
r.index;`,
    },
    {
      name: 'a binding filled by a handler declared after the reader is not "never written" (eslint rules)',
      code: `function rule() {
  let info: any = null;
  function read() { return info.x; }
  return { enter() { info = { x: 1 }; }, read };
}`,
    },
    {
      name: 'same for `let x;` with a deferred write in another closure',
      code: `function rule() {
  let scope: any;
  function read() { return scope.set; }
  return { Program(n: any) { scope = n; }, read };
}`,
    },
    {
      name: 'a destructured element is not the container (eslint no-irregular-whitespace shape)',
      code: `${PRELUDE}const [, offset] = s.match(/^(\\s*)/u);
offset.length;`,
    },
    {
      name: 'array destructuring of a `.find` result binds elements, not the result',
      code: `${PRELUDE}const [first] = xs.find((r) => r);
first.go();`,
    },
    {
      name: 'a length check in the loop test proves `pop()` has a value',
      code: `const stack: any[] = [];
while (stack.length) { const scope = stack.pop(); scope.go(); }`,
    },
    {
      name: 'a `> 0` length check guards `shift()`',
      code: `const q: any[] = [];
while (q.length > 0) { const n = q.shift(); n.next; }`,
    },
    {
      name: 'an `if` length check guards `pop()`',
      code: `const q: any[] = [];
if (q.length !== 0) { const n = q.pop(); n.next; }`,
    },
    {
      name: 'a `this.items` receiver is a comparable key',
      code: `class Q { items: any[] = []; run() { while (this.items.length) { const n = this.items.pop(); n.go(); } } }`,
    },
    {
      name: 'a bracket-spelled property is the same key as a dotted one',
      code: `const o = { q: [] as any[] };
while (o['q'].length) { const n = o.q.pop(); n.go(); }`,
    },
    {
      name: 'the length test is one conjunct of a longer `&&`',
      code: `const q: any[] = [];
declare const ok: boolean;
while (q.length && ok) { const n = q.pop(); n.go(); }`,
    },
    {
      name: '`0 < q.length`, mirrored',
      code: `const q: any[] = [];
while (0 < q.length) { const n = q.pop(); n.go(); }`,
    },
    {
      name: '`1 <= q.length`, mirrored',
      code: `const q: any[] = [];
while (1 <= q.length) { const n = q.shift(); n.go(); }`,
    },
    {
      name: '`0 !== q.length`, mirrored',
      code: `const q: any[] = [];
while (0 !== q.length) { const n = q.pop(); n.go(); }`,
    },
    {
      name: '`q.length >= 1`',
      code: `const q: any[] = [];
while (q.length >= 1) { const n = q.pop(); n.go(); }`,
    },
    {
      name: '`await fail()` ends the branch too',
      code: `declare function fail(m: string): never;
declare const s: string;
async function g() {
  const r = /a/.exec(s);
  if (!r) await fail('x');
  return r.index;
}`,
    },
    {
      name: 'a never function declared in an outer scope is found from an inner one',
      code: `declare function fail(m: string): never;
declare const s: string;
function g() {
  const r = /a/.exec(s);
  if (!r) fail('x');
  return r.index;
}`,
    },
    {
      name: 'an arrow function declared `: never`',
      code: `const die = (m: string): never => { throw new Error(m); };
declare const s: string;
const r = /a/.exec(s);
if (!r) die('x');
r.index;`,
    },
    {
      name: 'a function expression declared `: never`',
      code: `const die = function (m: string): never { throw new Error(m); };
declare const s: string;
const r = /a/.exec(s);
if (!r) die('x');
r.index;`,
    },
    {
      name: 'a variable annotated with a function type returning never',
      code: `declare const impl: (m: string) => never;
const die: (m: string) => never = impl;
declare const s: string;
const r = /a/.exec(s);
if (!r) die('x');
r.index;`,
    },
    {
      name: '`!!x && x.y` is the truthy test spelled twice',
      code: `${PRELUDE}const c = xs.pop();
const v = !!c && c.range;`,
    },
    {
      name: 'the length test on the right of a longer `&&`',
      code: `const q: any[] = [];
declare const ok: boolean;
while (ok && q.length) { const n = q.pop(); n.go(); }`,
    },
    {
      name: 'the guard is the SECOND conjunct of a left-nested `&&`',
      code: `${PRELUDE}const m = /a(b)/.exec(s);
const v = s.length && m && m[1];`,
    },
    {
      name: 'a loop test of `!= null` guards its body',
      code: `${PRELUDE}const m = /a(b)/.exec(s);
while (m != null) { use(m[1]); break; }`,
    },
    {
      name: '`m !== null` is complete for exec(), which misses with null only',
      code: `${PRELUDE}const m = /a/.exec(s);
const index = m !== null && m.index;`,
    },
  ],
  invalid: [
    {
      name: 'a read AFTER the loop is not guarded by the loop test',
      code: `${PRELUDE}const m = /a(b)/.exec(s);
while (m) { break; }
use(m[1]);`,
      errors: miss,
    },
    {
      name: 'a do-while body runs before its test',
      code: `${PRELUDE}const m = /a(b)/.exec(s);
do { use(m[1]); } while (m);`,
      errors: miss,
    },
    {
      name: 'a loop test about a different value guards nothing',
      code: `${PRELUDE}const m = /a(b)/.exec(s);
const other = xs.length;
while (other) { use(m[1]); break; }`,
      errors: miss,
    },
    {
      name: 'a truthy guard on one binding does not cover another chain',
      code: `${PRELUDE}const m = /a(b)/.exec(s);
const n = /c(d)/.exec(s);
if (n) { m[1].length; }`,
      errors: miss,
    },
    {
      name: '`!a || b.y` guards a, not b',
      code: `${PRELUDE}const a = xs.pop();
const b = xs.pop();
const v = !a || b.range;`,
      errors: miss,
    },
    {
      name: '`x || x.y` runs the right side when x is FALSY',
      code: `${PRELUDE}const c = xs.pop();
const v = c || c.range;`,
      errors: miss,
    },
    {
      name: '`Boolean(other) && x.y` guards the wrong value',
      code: `${PRELUDE}const a = xs.pop();
const b = xs.pop();
const v = Boolean(a) && b.type;`,
      errors: miss,
    },
    {
      name: 'a guard that calls a function returning void falls through',
      code: `declare function warn(msg: string): void;
declare const s: string;
const r = /a/.exec(s);
if (!r) warn('x');
r.index;`,
      errors: miss,
    },
    {
      name: 'an undeclared call is not assumed to be `never`',
      code: `declare const s: string;
const r = /a/.exec(s);
if (!r) mystery('x');
r.index;`,
      errors: miss,
    },
    {
      name: 'a closure over a binding NOTHING ever writes still reads null',
      code: `function rule() {
  let info: any = null;
  function read() { return info.x; }
  return read;
}`,
      errors: miss,
    },
    {
      name: 'straight-line read before the only write still reports (existing contract)',
      code: `let m: any = null;
const hooks = m.hooks;
m = { hooks: 1 };`,
      errors: miss,
    },
    {
      name: 'destructuring a nullable result itself still reports',
      code: `${PRELUDE}const m = /^(\\s*)/u.exec(s);
const [, offset] = m;`,
      errors: miss,
    },
    {
      name: 'an unguarded pop still reports',
      code: `const stack: any[] = [];
const scope = stack.pop();
scope.go();`,
      errors: miss,
    },
    {
      name: 'a length check on a DIFFERENT array does not guard the pop',
      code: `const a: any[] = [];
const b: any[] = [];
while (a.length) { const n = b.pop(); n.next; }`,
      errors: miss,
    },
    {
      name: 'a second pop in the same iteration is not covered by one length check',
      code: `const q: any[] = [];
while (q.length) { const a = q.pop(); const b = q.pop(); b.next; }`,
      errors: miss,
    },
    {
      name: 'a length compared with a variable proves nothing about emptiness',
      code: `declare const limit: number;
const q: any[] = [];
while (q.length > limit) { const n = q.pop(); n.go(); }`,
      errors: miss,
    },
    {
      name: 'a mirrored comparison with a variable proves nothing',
      code: `declare const limit: number;
const q: any[] = [];
while (limit < q.length) { const n = q.pop(); n.go(); }`,
      errors: miss,
    },
    {
      name: '`q.length < 5` does not prove the array is non-empty',
      code: `const q: any[] = [];
while (q.length < 5) { const n = q.pop(); n.go(); }`,
      errors: miss,
    },
    {
      name: '`0 > q.length` does not prove the array is non-empty',
      code: `const q: any[] = [];
while (0 > q.length) { const n = q.pop(); n.go(); }`,
      errors: miss,
    },
    {
      name: 'a computed receiver is not a comparable key',
      code: `declare const i: number;
const bufs: any[][] = [];
while (bufs[i].length) { const n = bufs[i].pop(); n.go(); }`,
      errors: miss,
    },
    {
      name: 'a pop inside a nested function is not covered by the outer length test',
      code: `const q: any[] = [];
declare function run(f: () => void): void;
while (q.length) { run(() => { const n = q.pop(); n.go(); }); }`,
      errors: miss,
    },
    {
      name: 'an expression statement that is not a call does not end the branch',
      code: `declare const s: string;
const r = /a/.exec(s);
if (!r) r;
r.index;`,
      errors: miss,
    },
    {
      name: 'a shadowed `process` is not Node process',
      code: `declare const s: string;
function f(process: { exit(c: number): void }) {
  const r = /a/.exec(s);
  if (!r) process.exit(1);
  return r.index;
}`,
      errors: miss,
    },
    {
      name: 'a variable annotated with a function type returning void',
      code: `declare const impl: (m: string) => void;
const die: (m: string) => void = impl;
declare const s: string;
const r = /a/.exec(s);
if (!r) die('x');
r.index;`,
      errors: miss,
    },
    {
      name: 'a variable with no function type is not assumed to be never',
      code: `declare const impl: any;
const die = impl;
declare const s: string;
const r = /a/.exec(s);
if (!r) die('x');
r.index;`,
      errors: miss,
    },
    {
      name: 'a parameter callee is not assumed to be never',
      code: `declare const s: string;
function g(die: (m: string) => never) {
  const r = /a/.exec(s);
  if (!r) die('x');
  return r.index;
}`,
      errors: miss,
    },
    {
      name: 'a callee declared twice is not assumed to be never',
      code: `declare const s: string;
var die = (m: string): never => { throw new Error(m); };
var die = (m: string): void => {};
const r = /a/.exec(s);
if (!r) die('x');
r.index;`,
      errors: miss,
    },
    {
      name: '`Boolean(...spread)` guards nothing identifiable',
      code: `${PRELUDE}const c = xs.pop();
const v = Boolean(...xs) && c.type;`,
      errors: miss,
    },
    {
      name: 'a single negation on the left is the opposite of a guard',
      code: `${PRELUDE}const c = xs.pop();
const v = !c && c.range;`,
      errors: miss,
    },
    {
      name: '`x == null && x.y` runs the right side when x IS null',
      code: `${PRELUDE}const c = xs.pop();
const v = c == null && c.range;`,
      errors: miss,
    },
    {
      name: '`x === null && x.y` runs the right side when x IS null',
      code: `${PRELUDE}const c = xs.pop();
const v = c === null && c.range;`,
      errors: miss,
    },
    {
      name: 'a call-result receiver is not a comparable key',
      code: `declare function getQ(): any[];
while (getQ().length) { const n = getQ().pop(); n.go(); }`,
      errors: miss,
    },
    {
      name: 'a callee that is not a plain identifier is not assumed to be never',
      code: `declare const s: string;
declare function getDie(): (m: string) => never;
const r = /a/.exec(s);
if (!r) getDie()('x');
r.index;`,
      errors: miss,
    },
    {
      name: 'a parameter is not the never function its enclosing function might be',
      code: `declare const s: string;
function g(die: (m: string) => void): never {
  const r = /a/.exec(s);
  if (!r) die('x');
  r.index;
  throw new Error('end');
}`,
      errors: miss,
    },
    {
      name: 'an `||` on the left of `&&` proves nothing about either side',
      code: `${PRELUDE}const c = xs.pop();
const v = (c || xs) && c.range;`,
      errors: miss,
    },
    {
      name: 'a comparison that is not about the length proves nothing',
      code: `declare const count: number;
const q: any[] = [];
while (count > 0) { const n = q.pop(); n.go(); }`,
      errors: miss,
    },
    {
      name: '`x !== null` alone does not exclude the undefined that find() returns',
      code: `${PRELUDE}const w = xs.find((r) => r);
const z = w !== null && w.id;`,
      errors: miss,
    },
    {
      name: '`x !== undefined` alone does not exclude null',
      code: `${PRELUDE}const m = /a(b)/.exec(s);
const z = m !== undefined && m[1];`,
      errors: miss,
    },
    {
      name: 'a strict inequality about another value proves nothing',
      code: `${PRELUDE}const w = xs.find((r) => r);
declare const other: unknown;
const z = other !== null && other !== undefined && w.id;`,
      errors: miss,
    },
    {
      name: 'a loop whose test is `=== null` runs its body with the value null',
      code: `${PRELUDE}const m = /a(b)/.exec(s);
while (m === null) { use(m[1]); break; }`,
      errors: miss,
    },
    {
      name: 'a loop test that can pass with a nullish value guards nothing',
      code: `${PRELUDE}const m = /a(b)/.exec(s);
while (m || true) { use(m[1]); break; }`,
      errors: miss,
    },
    {
      name: 'an outer length test does not cover a pop that a loop repeats',
      code: `const q: any[] = [{}];
if (q.length) { for (let i = 0; i < 2; i++) { const n = q.pop(); n.x; } }`,
      errors: miss,
    },
    {
      name: 'a do-while around the pop repeats it too',
      code: `const q: any[] = [{}];
if (q.length) { do { const n = q.pop(); n.x; } while (false); }`,
      errors: miss,
    },
    {
      name: 'emptying the array between the test and the pop',
      code: `const q: any[] = [{}];
if (q.length) { q.length = 0; const n = q.pop(); n.x; }`,
      errors: miss,
    },
    {
      name: 'reassigning the array between the test and the pop',
      code: `let q: any[] = [{}];
if (q.length) { q = []; const n = q.pop(); n.x; }`,
      errors: miss,
    },
    {
      name: 'decrementing the length between the test and the pop',
      code: `const q: any[] = [{}];
if (q.length) { q.length--; const n = q.pop(); n.x; }`,
      errors: miss,
    },
    {
      name: 'a binding that is not a plain producer result gets no single-check shortcut',
      code: `${PRELUDE}declare const ok: boolean;
const w = ok ? xs.find((r) => r) : null;
const z = w !== null && w.id;`,
      errors: miss,
    },
    {
      name: '`w !== undefined` alone is not complete for find(): a matching element can be null',
      code: `const xs = [null];
const w = xs.find(() => true);
const z = w !== undefined && w.id;`,
      errors: miss,
    },
  ],
});

describe('hasNullCheck on a name the file never declares', () => {
  // The rule's listeners only call hasNullCheck for a binding that carries
  // nullability evidence, but the helper is exported: a strict inequality on an
  // unresolvable name must answer "no single-check shortcut", not throw.
  const verdicts = (code: string): boolean[] => {
    const seen: boolean[] = [];
    new Linter({ configType: 'flat' }).verify(
      code,
      [
        {
          files: ['**/*.ts'],
          languageOptions: { parser },
          plugins: {
            probe: {
              rules: {
                run: {
                  create: (ctx) => ({
                    MemberExpression: (node) => {
                      seen.push(hasNullCheck(node, ctx.sourceCode));
                    },
                  }),
                },
              },
            },
          },
          rules: { 'probe/run': 'error' },
        },
      ],
      { filename: 'a.ts' },
    );
    return seen;
  };

  it('does not treat `u !== null` as a complete guard when u has no producer', () => {
    expect(verdicts('const z = u !== null && u.id;')).toEqual([false]);
  });

  it('still accepts `u != null`', () => {
    expect(verdicts('const z = u != null && u.id;')).toEqual([true]);
  });
});
