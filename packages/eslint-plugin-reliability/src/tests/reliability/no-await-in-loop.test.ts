/**
 * Tests for no-await-in-loop rule
 * Disallow await inside loops without considering concurrency implications
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noAwaitInLoop } from '../../rules/reliability/no-await-in-loop';

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

describe('no-await-in-loop', () => {
  describe('valid patterns', () => {
    ruleTester.run('allow non-awaited loops', noAwaitInLoop, {
      valid: [
        // No await in loop
        {
          name: 'a loop with no await in it',
          code: `
            for (const item of items) {
              process(item);
            }
          `,
        },
        // Await outside loop
        {
          code: `
            await beforeLoop();
            for (const item of items) {
              process(item);
            }
            await afterLoop();
          `,
        },
        // Using Promise.all (correct pattern)
        {
          code: `
            await Promise.all(items.map(async (item) => {
              await processItem(item);
            }));
          `,
        },
        // Await in nested function (different scope)
        {
          code: `
            for (const item of items) {
              const handler = async () => await processItem(item);
              handlers.push(handler);
            }
          `,
        },
        // for-of allowed with option
        {
          code: `
            for (const item of items) {
              await process(item);
            }
          `,
          options: [{ allowForOf: true }],
        },
        // while allowed with option
        {
          code: `
            while (condition) {
              await process();
            }
          `,
          options: [{ allowWhile: true }],
        },
        // burgee scripts/rank-dependents.ts:424 — the awaited iterable of a
        // for-of is evaluated once, before iteration, so it costs 1x latency,
        // not Nx. It is literally the Promise.all() remedy the rule prescribes.
        {
          name: 'awaited iterable in a for-of head runs once and is not a sequential loop cost',
          code: `
            async function f(names) {
              for (const p of await Promise.all(names.map(probe))) {
                record(p);
              }
            }
          `,
        },
        {
          name: 'awaited object in a for-in head runs once and is not a sequential loop cost',
          code: `
            async function f() {
              for (const k in await getObj()) {
                use(k);
              }
            }
          `,
        },
        {
          name: 'await in a classic for init runs once and is not a sequential loop cost',
          code: `
            async function f() {
              for (let i = await start(); i < 10; i++) {
                use(i);
              }
            }
          `,
        },
      ],
      invalid: [
        // for-of with await
        {
          name: 'awaiting inside a loop serialises work that could run together',
          code: `
            for (const item of items) {
              await process(item);
            }
          `,
          errors: [{ messageId: 'awaitInLoop' }],
        },
        // One await nested k loops deep was reported k times, byte-identical.
        // Each await belongs to exactly one loop: its innermost enclosing one.
        {
          name: 'an await nested in two loops is reported once, not once per enclosing loop',
          code: `
            async function f(groups) {
              for (const g of groups) {
                for (const id of g) {
                  await work(id);
                }
              }
            }
          `,
          errors: [{ messageId: 'awaitInLoop' }],
        },
        // These four loop-head slots DO re-evaluate every iteration, so
        // exempting loop heads wholesale would turn this FP fix into an FN.
        {
          name: 'await in a while test re-runs every iteration and stays reported',
          code: `async function f() { while (await hasMore()) { step(); } }`,
          errors: [{ messageId: 'awaitInLoop' }],
        },
        {
          name: 'await in a do-while test re-runs every iteration and stays reported',
          code: `async function f() { do { step(); } while (await hasMore()); }`,
          errors: [{ messageId: 'awaitInLoop' }],
        },
        {
          name: 'await in a classic for test re-runs every iteration and stays reported',
          code: `async function f() { for (let i = 0; await hasMore(i); i++) { step(); } }`,
          errors: [{ messageId: 'awaitInLoop' }],
        },
        {
          name: 'await in a classic for update re-runs every iteration and stays reported',
          code: `async function f() { for (let i = 0; i < 10; i = await next(i)) { step(); } }`,
          errors: [{ messageId: 'awaitInLoop' }],
        },
        // Interaction guard: a once-evaluated head await still costs Nx when
        // the loop is itself nested, so it must be attributed to the ENCLOSING
        // loop rather than dropped by both.
        {
          name: 'an awaited inner-loop head inside an outer loop is attributed to the outer loop',
          code: `
            async function f(groups) {
              for (const g of groups) {
                for (const p of await Promise.all(g.map(probe))) {
                  record(p);
                }
              }
            }
          `,
          errors: [{ messageId: 'awaitInLoop' }],
        },
        // A destructuring default in the for-of binding DOES run per iteration.
        {
          name: 'await in a for-of binding default runs per iteration and stays reported',
          code: `async function f(xs) { for (const { x = await def() } of xs) { use(x); } }`,
          errors: [{ messageId: 'awaitInLoop' }],
        },
        // A nested while has no once-evaluated head at all, so the outer loop
        // claims nothing from it and the while reports its own test await once.
        {
          name: 'a nested while test await is reported once, by the while itself',
          code: `async function f(xs) { for (const x of xs) { while (await hasMore(x)) { step(); } } }`,
          errors: [{ messageId: 'awaitInLoop' }],
        },
        // A nested for with an EMPTY init has a once-evaluated slot that holds
        // nothing, so there is nothing for the outer loop to claim.
        {
          name: 'a nested for with no init contributes nothing to the outer loop',
          code: `async function f(xs) { for (const x of xs) { for (;;) { await work(x); break; } } }`,
          errors: [{ messageId: 'awaitInLoop' }],
        },
        // for loop with await
        {
          code: `
            for (let i = 0; i < items.length; i++) {
              await process(items[i]);
            }
          `,
          errors: [{ messageId: 'awaitInLoop' }],
        },
        // while loop with await
        {
          code: `
            while (hasMore()) {
              await fetchNext();
            }
          `,
          errors: [{ messageId: 'awaitInLoop' }],
        },
        // do-while with await
        {
          code: `
            do {
              await fetchPage();
            } while (hasNextPage());
          `,
          errors: [{ messageId: 'awaitInLoop' }],
        },
        // Multiple awaits in loop
        {
          code: `
            for (const item of items) {
              await validate(item);
              await save(item);
            }
          `,
          errors: [{ messageId: 'awaitInLoop' }, { messageId: 'awaitInLoop' }],
        },
      ],
    });
  });
  describe('Loop Variants and Operation Analysis', () => {
    ruleTester.run('loop-type and callee-shape coverage', noAwaitInLoop, {
      valid: [],
      invalid: [
        // for-in loop with await
        {
          code: 'async function f(obj) { for (const k in obj) { await handle(k); } }',
          errors: [{ messageId: 'awaitInLoop' }],
        },
        // Member-expression callee — operation name comes from the property
        {
          code: 'async function f(xs) { for (const x of xs) { await api.fetch(x); } }',
          errors: [{ messageId: 'awaitInLoop' }],
        },
        // Computed member callee — property is not an Identifier
        {
          code: 'async function f(xs) { for (const x of xs) { await api["get"](x); } }',
          errors: [{ messageId: 'awaitInLoop' }],
        },
        // Callee is itself a call — neither Identifier nor MemberExpression
        {
          code: 'async function f(xs) { for (const x of xs) { await (pick())(x); } }',
          errors: [{ messageId: 'awaitInLoop' }],
        },
        // push side effect forces the sequential suggestion path
        {
          code: 'async function f(xs) { const out = []; for (const x of xs) { out.push(x); await save(x); } }',
          errors: [{ messageId: 'awaitInLoop' }],
        },
        // Sparse array literal → null entries in AST child arrays
        {
          code: 'async function f(xs) { for (const x of xs) { const pair = [, x]; await g(pair); } }',
          errors: [{ messageId: 'awaitInLoop' }],
        },
      ],
    });
  });
});
