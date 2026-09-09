/**
 * A promise is floating when its value is DISCARDED, not whenever it is unawaited.
 *
 * The rule reported every promise in a value position: assigned to a binding, passed
 * as an argument, set as a property, returned. Each of those has an owner — the code
 * that reads the binding, the callee, the caller — and none of them is the site that
 * can add a `.catch`. `Promise.race([work(), work()])` drew three findings for one
 * expression: the race and each of the two promises it consumes.
 *
 * `.then(onFulfilled, onRejected)` was also read as unhandled, when the rejection
 * handler is its second argument; only `.catch` and `.finally` counted.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnhandledPromise as rule } from './no-unhandled-promise';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-unhandled-promise — value positions (reliability)', () => {
  ruleTester.run('a promise whose value is used is not floating', rule, {
    valid: [
      {
        name: 'returned — the caller owns it',
        code: 'async function work() { return 1; } export async function f() { return work().then((n) => n + 1); }',
      },
      {
        name: 'stored in a binding',
        code: 'async function work() { return 1; } export function f() { const done = work(); return { done }; }',
      },
      {
        name: 'assigned to an existing binding',
        code: 'async function work() { return 1; } export function f() { let c; c = work(); return c; }',
      },
      {
        name: 'a serialised chain re-assigned to its own binding',
        code: 'async function work() { return 1; } export function f() { let chain = Promise.resolve(); chain = work().catch(() => undefined); return chain; }',
      },
      {
        name: 'passed as an argument — the callee owns it',
        code: 'async function work() { return 1; } export function f() { return Promise.race([work(), work()]); }',
      },
      {
        name: 'an object property',
        code: 'async function work() { return 1; } export function f() { return { p: work() }; }',
      },
      {
        name: 'the concise body of an arrow',
        code: 'async function work() { return 1; } export const f = () => work();',
      },
      {
        name: '.then(onFulfilled, onRejected) — the rejection handler is the second argument',
        code: 'async function work() { return 1; } export function f() { work().then(() => 0, () => 1); }',
      },
      {
        name: 'a bin entry that settles both ways',
        code: 'async function main() { return 1; } main().then(() => process.exit(0), () => process.exit(1));',
      },
    ],
    invalid: [
      {
        name: 'discarded as a statement, with no rejection handler',
        code: 'async function work() { return 1; } export function f() { work(); }',
        errors: [{ messageId: 'unhandledPromise' as const }],
      },
      {
        name: '.then with only a fulfilment handler, discarded',
        code: 'async function work() { return 1; } export function f() { work().then(() => 0); }',
        errors: [{ messageId: 'unhandledPromise' as const }],
      },
      {
        name: '.then with a single argument does not become handled by being second-guessed',
        code: 'async function work() { return 1; } export function f() { work().then(undefined); }',
        errors: [{ messageId: 'unhandledPromise' as const }],
      },
      {
        name: 'void does not count as using the value',
        code: 'async function work() { return 1; } export function f() { void work(); }',
        errors: [{ messageId: 'unhandledPromise' as const }],
      },
    ],
  });

  // Branch coverage for `isValueConsumed`'s walk: one case per arm, each a real
  // shape rather than a synthetic AST.
  ruleTester.run('every position the walk distinguishes', rule, {
    valid: [
      {
        name: 'TSAsExpression: the promise is cast on its way to a binding',
        code: 'async function work() { return 1; } export function f() { const p = work() as Promise<number>; return p; }',
      },
      {
        name: 'TSNonNullExpression: asserted non-null on its way to a binding',
        code: 'async function work() { return 1; } export function f() { const p = work()!; return p; }',
      },
      {
        name: 'a non-void unary operand — the value is used, so the walk stops there',
        code: 'async function work() { return 1; } export function f() { return !work(); }',
      },
      {
        name: 'the last operand of a comma is the value of the whole',
        code: 'async function work() { return 1; } export function f() { const p = (0, work()); return p; }',
      },
    ],
    invalid: [
      {
        name: 'a computed key is read, never settled',
        code: 'async function work() { return 1; } declare const items: number[]; export function f() { return items[work() as unknown as number]; }',
        errors: [{ messageId: 'unhandledPromise' as const }],
      },
      {
        name: 'reading `.then` without calling it drops the promise',
        code: 'async function work() { return 1; } export function f() { const t = work().then; return t; }',
        errors: [{ messageId: 'unhandledPromise' as const }],
      },
      {
        name: 'a non-final comma operand is discarded',
        code: 'async function work() { return 1; } export function f() { const n = (work(), 1); return n; }',
        errors: [{ messageId: 'unhandledPromise' as const }],
      },
      {
        name: 'a discarded call with no member callee at all',
        code: 'async function work() { return 1; } export function f() { work(); }',
        errors: [{ messageId: 'unhandledPromise' as const }],
      },
      {
        name: 'an argument to a call that is not a Promise combinator',
        code: 'async function work() { return 1; } export function f() { console.log(work()); }',
        errors: [{ messageId: 'unhandledPromise' as const }],
      },
      {
        name: '.then whose second argument is written out as undefined',
        code: 'async function work() { return 1; } export function f() { work().then(() => 0, undefined); }',
        errors: [{ messageId: 'unhandledPromise' as const }],
      },
      {
        name: '.then whose second argument is null',
        code: 'async function work() { return 1; } export function f() { work().then(() => 0, null); }',
        errors: [{ messageId: 'unhandledPromise' as const }],
      },
      {
        name: 'a discarded member call that is not .then',
        code: 'export function f() { Promise.resolve(); }',
        errors: [{ messageId: 'unhandledPromise' as const }],
      },
    ],
  });

  ruleTester.run('what actually owns a promise', rule, {
    valid: [
      {
        name: 'Promise.all settles every promise it is given',
        code: 'async function work() { return 1; } export function f() { return Promise.all([work(), work()]); }',
      },
      {
        name: 'Promise.allSettled likewise',
        code: 'async function work() { return 1; } export function f() { return Promise.allSettled([work()]); }',
      },
      {
        name: 'a named rejection handler',
        code: 'async function work() { return 1; } declare function fail(e: unknown): void; export function f() { work().then(() => 0, fail); }',
      },
      {
        name: 'a rejection handler read off an object',
        code: 'async function work() { return 1; } declare const h: { fail(e: unknown): void }; export function f() { work().then(() => 0, h.fail); }',
      },
    ],
    invalid: [
      {
        // `Promise.reject(work())` on its own is decided by an older rule in this
        // file — when an inner call is an ARGUMENT and the outer call is itself a
        // promise, only the outer reports. Wrapping in an array steps around that
        // rule and asks the question this fix owns: does `reject` settle what it
        // is handed? It does not — the value becomes the rejection REASON.
        name: 'Promise.reject does not settle the promises it is handed',
        code: 'async function work() { return 1; } export function f() { return Promise.reject([work()]); }',
        errors: [{ messageId: 'unhandledPromise' as const }],
      },
      {
        name: 'a non-callable second argument is ignored by then',
        code: 'async function work() { return 1; } export function f() { work().then(() => 0, 42); }',
        errors: [{ messageId: 'unhandledPromise' as const }],
      },
      {
        name: 'a string second argument is ignored by then',
        code: 'async function work() { return 1; } export function f() { work().then(() => 0, "nope"); }',
        errors: [{ messageId: 'unhandledPromise' as const }],
      },
    ],
  });

  ruleTester.run('the promise has to be inside the iterable', rule, {
    valid: [
      {
        name: 'a cast rejection handler is still a handler',
        code: 'async function work() { return 1; } declare function fail(e: unknown): void; export function f() { work().then(() => 0, fail as (e: unknown) => void); }',
      },
    ],
    // No `invalid` case for `Promise.all(work())`. The guard added here is real —
    // a promise handed where an iterable belongs is not owned by the combinator —
    // but it is not observable through this rule's report path: an older skip in
    // `checkCallExpression` already returns for an inner call that is an ARGUMENT
    // of an outer call which is itself a promise, and `Promise.all(…)` is one.
    // Asserting a report there would pin behaviour this change does not produce.
    invalid: [],
  });
});
