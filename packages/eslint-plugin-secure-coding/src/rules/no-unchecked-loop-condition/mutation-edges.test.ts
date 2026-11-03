/**
 * Mutation-survivor kill fixtures (Stryker triage, 2026-11-02).
 *
 * Each case is the input that tells the rule apart from a surviving mutant.
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

const unchecked = [{ messageId: 'uncheckedLoopCondition' as const }];
const bound = [{ messageId: 'userControlledLoopBound' as const }];
const infinite = [{ messageId: 'infiniteLoop' as const }];
const recursion = [{ messageId: 'unsafeRecursion' as const }];
const large = [{ messageId: 'largeLoopBound' as const }];

const guard =
  'if (!Array.isArray(req.body.items) || req.body.items.length > 100) throw new Error();';

describe('no-unchecked-loop-condition (mutation edges)', () => {
  ruleTester.run('no-unchecked-loop-condition', noUncheckedLoopCondition, {
    valid: [
      {
        name: 'a BigInt loop bound under maxStaticIterations is not large',
        code: 'let i = 0n; while (i < 100n) { i++; }',
      },
      {
        name: 'a clamped destructured bound is not user-controlled',
        code: 'function h(req) { const { limit } = { limit: Math.min(req.query.limit, 100) }; for (let i = 0; i < limit; i++) {} }',
      },
      {
        name: 'a custom two-name list is not the default list, so event is not a request',
        options: [{ userInputVariables: ['req', 'input'] }],
        code: 'for (const r of event.records) {}',
      },
      {
        name: 'a custom list without req is not the default list either',
        options: [{ userInputVariables: ['payload', 'input'] }],
        code: 'for (const r of event.records) {}',
      },
      {
        name: 'a guard that walks into a callback argument does not crash',
        code: 'if (!Array.isArray(req.body.items) || req.body.items.length > 100 || req.body.items.some((x) => !x)) throw new Error(); for (const x of req.body.items) {}',
      },
      {
        name: 'a size check inside a call argument of the enclosing if validates the loop',
        code: 'if (ok(Array.isArray(req.body.items) && req.body.items.length < 100)) { for (const x of req.body.items) {} }',
      },
      {
        name: 'a guard clause two blocks up still validates the loop',
        code: `${guard} if (verbose) { for (const x of req.body.items) log(x); }`,
      },
      {
        name: 'a guard clause in a function body validates the loop',
        code: `function h(req) { ${guard} for (const x of req.body.items) {} }`,
      },
      {
        name: 'a clamp plus a constant stays clamped',
        code: 'const limit = Math.min(req.query.limit, 100) + 1; for (let i = 0; i < limit; i++) {}',
      },
      {
        name: 'a clamp with a constant fallback stays clamped',
        code: 'const limit = Math.min(req.query.limit, 100) || 10; for (let i = 0; i < limit; i++) {}',
      },
      {
        name: 'an || of two flags is not a request bound',
        code: 'while (running || pending) { step(); }',
      },
      {
        name: 'an equality test is not an iteration bound',
        code: 'while (code === 20000) { code = next(); }',
      },
      {
        name: 'a loop bound exactly at maxStaticIterations is within it',
        code: 'for (let i = 0; i < 10000; i++) {}',
      },
      {
        name: 'an @safe annotation exempts a while (true) with no exit',
        code: '/** @safe */\nwhile (true) { doWork(); }',
      },
      {
        name: 'a throw guard before the self-call is a base case',
        code: "function f(n) { if (n < 0) throw new Error('neg'); f(n - 1); }",
      },
      {
        name: 'a base case that destructures with a hole still exits',
        code: 'function f(pair) { if (pair) { const [, rest] = pair; return rest; } f(pair); }',
      },
      {
        name: 'two conditional self-calls stay within a recursion budget of two',
        options: [{ maxRecursionDepth: 2 }],
        code: 'function walk(n) { if (n.l) walk(n.l); if (n.r) walk(n.r); }',
      },
    ],
    invalid: [
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: a BigInt loop bound is estimated against maxStaticIterations',
        // @found mutation testing
        code: 'let i = 0n; while (i < 10_000_000n) { i++; }',
        errors: large,
      },
      {
        name: 'FN: a bound destructured from the request query is user-controlled',
        // @found mutation testing
        code: 'function h(req) { const { limit } = req.query; for (let i = 0; i < limit; i++) {} }',
        errors: bound,
      },
      {
        name: 'FN: a bound destructured through the request property is user-controlled',
        // @found mutation testing
        code: 'function h(req) { const { query: { limit = 10 } } = req; for (let i = 0; i < limit; i++) {} }',
        errors: bound,
      },
      {
        name: 'a custom list matches any of its names, not only the first',
        options: [{ userInputVariables: ['input', 'payload'] }],
        code: 'for (const x of payload.items) {}',
        errors: unchecked,
      },
      {
        name: 'a length check without an array check does not validate',
        code: 'if (req.body.items.length > 100) throw new Error(); for (const x of req.body.items) {}',
        errors: unchecked,
      },
      {
        name: 'a bare isArray call is not Array.isArray',
        code: 'if (!isArray(req.body.items) || req.body.items.length > 100) throw new Error(); for (const x of req.body.items) {}',
        errors: unchecked,
      },
      {
        name: 'only the Array global isArray is an array check',
        code: 'if (!types.isArray(req.body.items) || req.body.items.length > 100) throw new Error(); for (const x of req.body.items) {}',
        errors: unchecked,
      },
      {
        name: 'an array check of a different field does not validate this one',
        code: 'if (!Array.isArray(req.body.list) || req.body.items.length > 100) throw new Error(); for (const x of req.body.items) {}',
        errors: unchecked,
      },
      {
        name: 'an array check through a differently named root does not validate this one',
        code: 'if (!Array.isArray(request.body.items) || req.body.items.length > 100) throw new Error(); for (const x of req.body.items) {}',
        errors: unchecked,
      },
      {
        name: 'an array check of a local does not validate a request field',
        code: 'const items = []; if (!Array.isArray(items) || items.length > 100) throw new Error(); for (const x of req.body.items) {}',
        errors: unchecked,
      },
      {
        name: 'an arithmetic use of the length is not a size check',
        code: 'if (!Array.isArray(req.body.items) || req.body.items.length % 2) throw new Error(); for (const x of req.body.items) {}',
        errors: unchecked,
      },
      {
        name: 'a comparison of something else is not a length check',
        code: 'if (!Array.isArray(req.body.items) || count > 100) throw new Error(); for (const x of req.body.items) {}',
        errors: unchecked,
      },
      {
        name: 'a comparison of another property is not a length check',
        code: 'if (!Array.isArray(req.body.items) || req.body.items.count > 100) throw new Error(); for (const x of req.body.items) {}',
        errors: unchecked,
      },
      {
        name: 'an enclosing if outside an arrow callback does not validate the loop inside it',
        code: 'if (Array.isArray(req.body.items) && req.body.items.length < 100) { later(() => { for (const x of req.body.items) {} }); }',
        errors: unchecked,
      },
      {
        name: 'an enclosing if outside a function expression does not validate the loop inside it',
        code: 'if (Array.isArray(req.body.items) && req.body.items.length < 100) { later(function () { for (const x of req.body.items) {} }); }',
        errors: unchecked,
      },
      {
        name: 'an enclosing if outside a function declaration does not validate the loop inside it',
        code: 'if (Array.isArray(req.body.items) && req.body.items.length < 100) { function run() { for (const x of req.body.items) {} } }',
        errors: unchecked,
      },
      {
        name: 'a guard clause outside an arrow callback does not validate the loop inside it',
        code: `${guard} later(() => { for (const x of req.body.items) {} });`,
        errors: unchecked,
      },
      {
        name: 'a guard clause outside a function expression does not validate the loop inside it',
        code: `${guard} later(function () { for (const x of req.body.items) {} });`,
        errors: unchecked,
      },
      {
        // @found mutation testing
        name: 'FN: a guard clause above a function declaration does not validate the loop inside it',
        code: `${guard} function run() { for (const x of req.body.items) {} }`,
        errors: unchecked,
      },
      {
        name: 'a guard clause after the loop does not validate it',
        code: `for (const x of req.body.items) {} ${guard}`,
        errors: unchecked,
      },
      {
        name: 'a guard on a shadowed binding of the same name does not validate the loop',
        code: `const items = req.body.items; if (!Array.isArray(items) || items.length > 100) throw new Error(); { const items = req.body.other; for (const x of items) {} }`,
        errors: unchecked,
      },
      {
        name: 'a guard on a global does not validate a local of the same name',
        code: `if (!Array.isArray(items) || items.length > 100) throw new Error(); { const items = req.body.other; for (const x of items) {} }`,
        errors: unchecked,
      },
      {
        name: 'a clamp on another method name is not Math.min',
        code: 'const limit = utils.min(req.query.limit, 100); for (let i = 0; i < limit; i++) {}',
        errors: bound,
      },
      {
        // @found mutation testing
        name: 'FN: an unclamped request value beside a clamp is still unbounded',
        code: 'const limit = parseInt(req.query.limit) || Math.min(fallback, 10); for (let i = 0; i < limit; i++) {}',
        errors: bound,
      },
      {
        // @found mutation testing
        name: 'FN: a request value multiplied by a clamp is still unbounded',
        code: 'const limit = req.query.pages * Math.min(size, 10); for (let i = 0; i < limit; i++) {}',
        errors: bound,
      },
      {
        name: 'a break of a nested for does not leave the outer while (true)',
        code: 'while (true) { for (let i = 0; i < 3; i++) { break; } }',
        errors: infinite,
      },
      {
        name: 'a break of a nested for-in does not leave the outer while (true)',
        code: 'while (true) { for (const k in obj) { break; } }',
        errors: infinite,
      },
      {
        name: 'a break of a nested while does not leave the outer while (true)',
        code: 'while (true) { while (more()) { break; } }',
        errors: infinite,
      },
      {
        name: 'a break of a nested do-while does not leave the outer while (true)',
        code: 'while (true) { do { break; } while (more()); }',
        errors: infinite,
      },
      {
        name: 'a break of a nested switch does not leave the outer while (true)',
        code: 'while (true) { switch (x) { case 1: break; } }',
        errors: infinite,
      },
      {
        name: 'a sparse array in the loop body does not stop the exit search',
        code: 'while (true) { const a = [, 1]; use(a); }',
        errors: infinite,
      },
      {
        name: 'a guard after the self-call is not a base case',
        code: 'function f(n) { f(n - 1); if (n < 0) return; }',
        errors: recursion,
      },
      {
        name: 'a return inside an earlier helper is not a base case',
        code: 'function f(n) { const g = () => { return 1; }; f(g()); }',
        errors: recursion,
      },
      {
        name: 'a nested function declaration ends before the outer self-call',
        code: 'function outer() { function inner() {} outer(); }',
        errors: recursion,
      },
      {
        name: 'a countdown to a large floor is a large bound',
        code: 'for (let i = 1e9; i > 20000; i--) {}',
        errors: large,
      },
      {
        name: 'a countdown to a large inclusive floor is a large bound',
        code: 'for (let i = 1e9; i >= 20000; i--) {}',
        errors: large,
      },
    ],
  });
});

describe('no-unchecked-loop-condition (recursion through callbacks)', () => {
  ruleTester.run('no-unchecked-loop-condition', noUncheckedLoopCondition, {
    valid: [
      {
        // @found mutation testing
        name: 'FP: a self-call inside a forEach callback stops at a leaf',
        code: 'function walk(n) { n.children.forEach((c) => walk(c)); }',
      },
      {
        // @found mutation testing
        name: 'FP: a self-call inside a function-expression callback runs only when called',
        code: 'function walk(n) { n.children.forEach(function (c) { walk(c); }); }',
      },
    ],
    invalid: [],
  });
});
