/**
 * `for (;;)` and `while (true)` are the same loop.
 *
 * `allowWhileTrueWithBreak` (on by default) exempts `while (true)` whose body breaks,
 * and the `for (;;)` branch never consulted it — so the two spellings of one loop got
 * opposite answers. `for (;;)` is the idiomatic spelling in a scanner or a find-up walk,
 * which is where this showed up.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUncheckedLoopCondition } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-unchecked-loop-condition — for(;;) matches while(true)', () => {
  ruleTester.run('for(;;) with a break', noUncheckedLoopCondition, {
    valid: [
      {
        name: 'for (;;) whose body breaks — the find-up walk',
        code: `
          function findUp(start) {
            let dir = start;
            for (;;) {
              if (exists(dir + '/package.json')) break;
              const parent = dirname(dir);
              if (parent === dir) break;
              dir = parent;
            }
            return dir;
          }
        `,
      },
      {
        name: 'a labelled break naming a label ABOVE the loop does leave it',
        code: 'outer: for (;;) { for (const x of xs) { if (x) break outer; } }',
      },
      {
        name: 'for (;;) whose body returns',
        code: `
          function next(it) {
            for (;;) {
              const v = it.read();
              if (v === null) return undefined;
              if (v !== '') return v;
            }
          }
        `,
      },
      {
        name: 'for (;;) whose body throws',
        code: `
          function drain(q) {
            for (;;) {
              if (q.empty()) throw new Error('drained');
              q.pop();
            }
          }
        `,
      },
      {
        name: 'while (true) with a break — unchanged, the reference behaviour',
        code: `
          function findUp2(start) {
            let dir = start;
            while (true) {
              if (exists(dir)) break;
              dir = dirname(dir);
            }
            return dir;
          }
        `,
      },
    ],
    invalid: [
      {
        name: 'for (;;) with no way out is still reported',
        code: 'for (;;) { tick(); }',
        errors: [{ messageId: 'infiniteLoop' as const }],
      },
      {
        name: 'a break belonging to an inner loop does not exempt the outer for(;;)',
        code: 'for (;;) { for (const x of xs) { break; } tick(); }',
        errors: [{ messageId: 'infiniteLoop' as const }],
      },
      {
        name: 'a return inside an arrow returns from the arrow, not from the loop',
        code: 'for (;;) { xs.forEach((x) => { return x; }); }',
        errors: [{ messageId: 'infiniteLoop' as const }],
      },
      {
        name: 'a return inside a function expression belongs to that function',
        code: 'for (;;) { register(function () { return 1; }); }',
        errors: [{ messageId: 'infiniteLoop' as const }],
      },
      {
        name: 'a return inside a nested declaration belongs to that declaration',
        code: 'for (;;) { function inner() { return 1; } register(inner); }',
        errors: [{ messageId: 'infiniteLoop' as const }],
      },
      {
        name: 'a labelled break naming a block INSIDE the body does not leave the loop',
        code: 'for (;;) { stop: { break stop; } tick(); }',
        errors: [{ messageId: 'infiniteLoop' as const }],
      },
      {
        name: 'a labelled break naming an inner loop does not leave the outer one',
        code: 'for (;;) { inner: for (const x of xs) { break inner; } tick(); }',
        errors: [{ messageId: 'infiniteLoop' as const }],
      },
      {
        name: 'opting out reports for(;;) with a break',
        code: 'for (;;) { if (done()) break; tick(); }',
        options: [{ allowWhileTrueWithBreak: false }],
        errors: [{ messageId: 'infiniteLoop' as const }],
      },
    ],
  });
});
