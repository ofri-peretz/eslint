/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
// Edge cases that pin each branch of the rule, so a change to one shows up.
import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnboundedCauseRecursion } from './no-unbounded-cause-recursion';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const unbounded = [{ messageId: 'unboundedCauseRecursion' as const }];

ruleTester.run(
  'no-unbounded-cause-recursion edges',
  noUnboundedCauseRecursion,
  {
    valid: [
      // A cause read inside a callback argument is not passed on now.
      `function walk(e) { walk(() => e.cause); }`,
      // An undeclared name carries no cause we can see.
      `function walk(e) { walk(globalCause); }`,
      // A recursion deferred to a callback runs on a fresh stack: no overflow.
      `function walk(e) { setTimeout(() => walk(e.cause)); }`,
      `function walk(e) { setTimeout(function () { walk(e.cause); }); }`,
      `function walk(e) { function later() { walk(e.cause); } queue(later); }`,
      // Helper memo tested in each kind of condition, then recorded.
      `const memo = new WeakMap();
    function walk(e) {
      const hit = has(memo, e) ? 1 : 0;
      if (hit) return;
      put(memo, e);
      walk(e.cause);
    }`,
      `const memo = new WeakMap();
    function walk(e) {
      while (has(memo, e)) return;
      put(memo, e);
      walk(e.cause);
    }`,
      `const memo = new WeakMap();
    function walk(e) {
      do { if (e) break; } while (has(memo, e));
      put(memo, e);
      walk(e.cause);
    }`,
      `const memo = new WeakMap();
    function walk(e) {
      has(memo, e) || (put(memo, e), walk(e.cause));
    }`,
      // Array and Map collections.
      `function walk(e, stack) {
      if (stack.includes(e)) return;
      stack.push(e);
      walk(e.cause, stack);
    }`,
      `function walk(e, map) {
      if (map.get(e)) return;
      map.set(e, true);
      walk(e.cause, map);
    }`,
      // A marker key tested with \`in\` and written on the walked error.
      `const MARK = Symbol();
    function walk(err) {
      if (MARK in err) return;
      err[MARK] = true;
      walk(err.cause);
    }`,
      // Depth bounds: compared on either side, passed on with + or - or ++.
      `function walk(e, depth) { if (10 < depth) return; walk(e.cause, 1 + depth); }`,
      `function walk(e, depth) { if (depth <= 0) return; walk(e.cause, depth - 1); }`,
      `function walk(e, depth) { if (depth >= 5) return; walk(e.cause, ++depth); }`,
      // Transpiled default parameters read from \`arguments\`.
      `function walk(e) {
      var depth = Number(arguments[1] || 0);
      if (depth > 10) return;
      walk(e.cause, depth + 1);
    }`,
      `function walk(e) {
      var depth = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
      if (depth > 10) return;
      walk(e.cause, depth + 1);
    }`,
      // Destructuring a key other than cause carries no cause.
      `function walk(e) { const { message: m } = e; walk(m); }`,
      // A variable reassigned from something other than a cause.
      `function walk(e) { let c; c = e.next; walk(c); }`,
      // errors.map on a function other than the walk, or on a non-errors list.
      `function walk(e) { e.errors.map(format); }`,
      `function walk(e) { e.items.map(walk); }`,
      `function walk(list) { list.map(walk); }`,
      // A binding that is not a plain name has nothing to call itself by.
      `const { walk } = (e) => walk(e.cause);`,
    ],
    invalid: [
      // Unresolved names are not guards.
      {
        code: `function walk(e) { log(GLOBAL.cause); walk(e.cause); }`,
        errors: unbounded,
      },
      {
        code: `function walk(e) { cache[k](e); walk(e.cause); }`,
        errors: unbounded,
      },
      {
        code: `function walk(e) { track(globalMemo, e); walk(e.cause); }`,
        errors: unbounded,
      },
      {
        code: `function walk(e) { e[MARKER] = 1; walk(e.cause); }`,
        errors: unbounded,
      },
      {
        code: `function walk(e) { if (KEY in e) return; walk(e.cause); }`,
        errors: unbounded,
      },
      {
        code: `function walk(e) { if (LIMIT > 3) return; walk(e.cause); }`,
        errors: unbounded,
      },
      // A destructured walked parameter.
      {
        code: `function walk({ x }) { walk(x.cause); }`,
        errors: unbounded,
      },
      // A guard inside a nested function does not guard the outer walk.
      {
        code: `const cache = new WeakSet();
      function walk(e) {
        const remember = (x) => { if (cache.has(x)) return; cache.add(x); };
        walk(e.cause);
      }`,
        errors: unbounded,
      },
      {
        code: `function walk(e) {
        var depth = (function () { return arguments.length; })();
        if (depth > 5) return;
        walk(e.cause, depth + 1);
      }`,
        errors: unbounded,
      },
      // A local with no initializer is not a depth parameter.
      {
        code: `function walk(e) { var depth; if (depth > 5) return; walk(e.cause, depth + 1); }`,
        errors: unbounded,
      },
      // A helper call outside any test records; it does not look up.
      {
        code: `const memo = new WeakMap(); function walk(e) { if (debug) log(memo, e); put(memo, e); walk(e.cause); }`,
        errors: unbounded,
      },
      {
        code: `const memo = new WeakMap(); function walk(e) { debug ? log(memo, e) : null; put(memo, e); walk(e.cause); }`,
        errors: unbounded,
      },
      {
        code: `const memo = new WeakMap(); function walk(e) { while (debug) { log(memo, e); break; } put(memo, e); walk(e.cause); }`,
        errors: unbounded,
      },
      {
        code: `const memo = new WeakMap(); function walk(e) { do { log(memo, e); } while (debug); put(memo, e); walk(e.cause); }`,
        errors: unbounded,
      },
      {
        code: `const memo = new WeakMap(); function walk(e) { debug && log(memo, e); put(memo, e); walk(e.cause); }`,
        errors: unbounded,
      },
      // A test outside the walk function is not the walk's own condition.
      {
        code: `const memo = new WeakMap(); if (function walk(e) { put(memo, e); walk(e.cause); }) {}`,
        errors: unbounded,
      },
      // Cause carried through destructuring with a renamed or quoted key.
      {
        code: `function walk(e) { const { cause: c } = e; walk(c); }`,
        errors: unbounded,
      },
      {
        code: `function walk(e) { const { 'cause': c } = e; walk(c); }`,
        errors: unbounded,
      },
      // Cause carried through a later assignment.
      {
        code: `function walk(e) { let c; c = e.cause; walk(c); }`,
        errors: unbounded,
      },
      // AggregateError branch through flatMap.
      {
        code: `function walk(e) { return e.errors.flatMap(walk); }`,
        errors: unbounded,
      },
      // A named function expression is reported under its own name.
      {
        code: `const outer = function inner(e) { inner(e.cause); };`,
        errors: [
          {
            messageId: 'unboundedCauseRecursion' as const,
            data: { name: 'inner' },
          },
        ],
      },
      // The walked error with a default value, tested and passed to helpers.
      {
        code: `function walk(e = {}) { if (isError(e)) format(e); walk(e.cause); }`,
        errors: unbounded,
      },
      // The walked error in the errors.map shape, tested and passed to helpers.
      {
        code: `function walk(e) { if (isError(e)) format(e); e.errors.map(walk); }`,
        errors: unbounded,
      },
      // A local whose .cause is read is walked too.
      {
        code: `function walk(e) { const x = e; if (isError(x)) format(x); walk(x.cause); }`,
        errors: unbounded,
      },
      // A marker written on another object does not mark the walked error.
      {
        code: `const MARK = Symbol();
      function walk(err) { if (MARK in err) return; other[MARK] = true; walk(err.cause); }`,
        errors: unbounded,
      },
      // A plain property write is not a marker.
      {
        code: `const MARK = 'm';
      function walk(err) { if (MARK in err) return; err.MARK = true; walk(err.cause); }`,
        errors: unbounded,
      },
      // A depth changed by something other than + or - is not a bound.
      {
        code: `function walk(e, depth) { if (depth > 64) return; walk(e.cause, depth * 2); }`,
        errors: unbounded,
      },
      // A compared local that is not a parameter resets on every call.
      {
        code: `function walk(e) { let d = 0; if (d > 3) return; walk(e.cause, d + 1); }`,
        errors: unbounded,
      },
    ],
  },
);
