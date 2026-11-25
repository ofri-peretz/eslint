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
      {
        name: 'a cause read inside a callback argument is not passed on to the recursive call now',
        code: `function walk(e) { walk(() => e.cause); }`,
      },
      // An undeclared name carries no cause we can see.
      {
        name: 'an undeclared name passed on carries no cause the rule can see',
        code: `function walk(e) { walk(globalCause); }`,
      },
      // A recursion deferred to a callback runs on a fresh stack: no overflow.
      {
        name: 'recursion deferred to a setTimeout arrow runs on a fresh stack, so there is no overflow',
        code: `function walk(e) { setTimeout(() => walk(e.cause)); }`,
      },
      {
        name: 'recursion deferred to a setTimeout function expression runs on a fresh stack',
        code: `function walk(e) { setTimeout(function () { walk(e.cause); }); }`,
      },
      {
        name: 'recursion inside a nested function that is only queued for later runs on a fresh stack',
        code: `function walk(e) { function later() { walk(e.cause); } queue(later); }`,
      },
      // Helper memo tested in each kind of condition, then recorded.
      {
        name: 'a helper memo tested in a ?: condition and then recorded is a visited guard',
        code: `const memo = new WeakMap();
    function walk(e) {
      const hit = has(memo, e) ? 1 : 0;
      if (hit) return;
      put(memo, e);
      walk(e.cause);
    }`,
      },
      {
        name: 'a helper memo tested in a while condition and then recorded is a visited guard',
        code: `const memo = new WeakMap();
    function walk(e) {
      while (has(memo, e)) return;
      put(memo, e);
      walk(e.cause);
    }`,
      },
      {
        name: 'a helper memo tested in a do-while condition and then recorded is a visited guard',
        code: `const memo = new WeakMap();
    function walk(e) {
      do { if (e) break; } while (has(memo, e));
      put(memo, e);
      walk(e.cause);
    }`,
      },
      {
        name: 'a helper memo tested on the left of || and then recorded is a visited guard',
        code: `const memo = new WeakMap();
    function walk(e) {
      has(memo, e) || (put(memo, e), walk(e.cause));
    }`,
      },
      // Array and Map collections.
      {
        name: 'an array parameter used as the visited stack (includes then push) bounds the walk',
        code: `function walk(e, stack) {
      if (stack.includes(e)) return;
      stack.push(e);
      walk(e.cause, stack);
    }`,
      },
      {
        name: 'a Map parameter used as the visited set (get then set) bounds the walk',
        code: `function walk(e, map) {
      if (map.get(e)) return;
      map.set(e, true);
      walk(e.cause, map);
    }`,
      },
      // A marker key tested with \`in\` and written on the walked error.
      {
        name: 'a marker key tested with in and written on the walked error bounds the walk',
        code: `const MARK = Symbol();
    function walk(err) {
      if (MARK in err) return;
      err[MARK] = true;
      walk(err.cause);
    }`,
      },
      // Depth bounds: compared on either side, passed on with + or - or ++.
      {
        name: 'a depth compared with the literal on the left and passed on as 1 + depth is bounded',
        code: `function walk(e, depth) { if (10 < depth) return; walk(e.cause, 1 + depth); }`,
      },
      {
        name: 'a depth compared with <= 0 and passed on as depth - 1 is bounded',
        code: `function walk(e, depth) { if (depth <= 0) return; walk(e.cause, depth - 1); }`,
      },
      {
        name: 'a depth compared with >= and passed on pre-incremented is bounded',
        code: `function walk(e, depth) { if (depth >= 5) return; walk(e.cause, ++depth); }`,
      },
      // Transpiled default parameters read from \`arguments\`.
      {
        name: 'a transpiled default parameter read as Number(arguments[1] || 0) is a depth parameter',
        code: `function walk(e) {
      var depth = Number(arguments[1] || 0);
      if (depth > 10) return;
      walk(e.cause, depth + 1);
    }`,
      },
      {
        name: 'a transpiled default parameter written as arguments.length > 1 ? arguments[1] : 0 is a depth parameter',
        code: `function walk(e) {
      var depth = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
      if (depth > 10) return;
      walk(e.cause, depth + 1);
    }`,
      },
      // Destructuring a key other than cause carries no cause.
      {
        name: 'destructuring a key other than cause carries no cause to the recursive call',
        code: `function walk(e) { const { message: m } = e; walk(m); }`,
      },
      // A variable reassigned from something other than a cause.
      {
        name: 'a variable reassigned from something other than a cause does not carry one',
        code: `function walk(e) { let c; c = e.next; walk(c); }`,
      },
      // errors.map on a function other than the walk, or on a non-errors list.
      {
        name: 'errors.map given a function other than the walk is not recursion',
        code: `function walk(e) { e.errors.map(format); }`,
      },
      {
        name: 'items.map(walk) maps a list that is not the errors of an AggregateError',
        code: `function walk(e) { e.items.map(walk); }`,
      },
      {
        name: 'list.map(walk) over a plain list is not an errors walk',
        code: `function walk(list) { list.map(walk); }`,
      },
      // A binding that is not a plain name has nothing to call itself by.
      {
        name: 'a binding that is not a plain name has nothing to call itself by',
        code: `const { walk } = (e) => walk(e.cause);`,
      },
    ],
    invalid: [
      // Unresolved names are not guards.
      {
        name: 'an unresolved global read is not a guard',
        code: `function walk(e) { log(GLOBAL.cause); walk(e.cause); }`,
        errors: unbounded,
      },
      {
        name: 'a computed call on a cache that is not a visited helper is not a guard',
        code: `function walk(e) { cache[k](e); walk(e.cause); }`,
        errors: unbounded,
      },
      {
        name: 'tracking a global memo the file never declares is not a guard',
        code: `function walk(e) { track(globalMemo, e); walk(e.cause); }`,
        errors: unbounded,
      },
      {
        name: 'writing a marker whose key is an unresolved name is not a guard',
        code: `function walk(e) { e[MARKER] = 1; walk(e.cause); }`,
        errors: unbounded,
      },
      {
        name: 'testing an unresolved key with in is not a guard',
        code: `function walk(e) { if (KEY in e) return; walk(e.cause); }`,
        errors: unbounded,
      },
      {
        name: 'comparing an unresolved limit is not a depth bound',
        code: `function walk(e) { if (LIMIT > 3) return; walk(e.cause); }`,
        errors: unbounded,
      },
      // A destructured walked parameter.
      {
        name: 'a destructured walked parameter with the cause read off its property is still an unguarded walk',
        code: `function walk({ x }) { walk(x.cause); }`,
        errors: unbounded,
      },
      // A guard inside a nested function does not guard the outer walk.
      {
        name: 'a guard inside a nested function does not guard the outer walk',
        code: `const cache = new WeakSet();
      function walk(e) {
        const remember = (x) => { if (cache.has(x)) return; cache.add(x); };
        walk(e.cause);
      }`,
        errors: unbounded,
      },
      {
        name: "a local counter computed from an IIFE's arguments is not a parameter of the walk",
        code: `function walk(e) {
        var depth = (function () { return arguments.length; })();
        if (depth > 5) return;
        walk(e.cause, depth + 1);
      }`,
        errors: unbounded,
      },
      // A local with no initializer is not a depth parameter.
      {
        name: 'a local with no initializer is not a depth parameter',
        code: `function walk(e) { var depth; if (depth > 5) return; walk(e.cause, depth + 1); }`,
        errors: unbounded,
      },
      // A helper call outside any test records; it does not look up.
      {
        name: 'a helper call inside an if with no lookup records but does not look up',
        code: `const memo = new WeakMap(); function walk(e) { if (debug) log(memo, e); put(memo, e); walk(e.cause); }`,
        errors: unbounded,
      },
      {
        name: 'a helper call in the branch of a ?: records but does not look up',
        code: `const memo = new WeakMap(); function walk(e) { debug ? log(memo, e) : null; put(memo, e); walk(e.cause); }`,
        errors: unbounded,
      },
      {
        name: 'a helper call in a while body records but does not look up',
        code: `const memo = new WeakMap(); function walk(e) { while (debug) { log(memo, e); break; } put(memo, e); walk(e.cause); }`,
        errors: unbounded,
      },
      {
        name: 'a helper call in a do-while body records but does not look up',
        code: `const memo = new WeakMap(); function walk(e) { do { log(memo, e); } while (debug); put(memo, e); walk(e.cause); }`,
        errors: unbounded,
      },
      {
        name: 'a helper call on the right of && records but does not look up',
        code: `const memo = new WeakMap(); function walk(e) { debug && log(memo, e); put(memo, e); walk(e.cause); }`,
        errors: unbounded,
      },
      // A test outside the walk function is not the walk's own condition.
      {
        name: "a test outside the walk function is not the walk's own condition",
        code: `const memo = new WeakMap(); if (function walk(e) { put(memo, e); walk(e.cause); }) {}`,
        errors: unbounded,
      },
      // Cause carried through destructuring with a renamed or quoted key.
      {
        name: 'the cause carried through destructuring with a renamed key is still the cause',
        code: `function walk(e) { const { cause: c } = e; walk(c); }`,
        errors: unbounded,
      },
      {
        name: 'the cause carried through destructuring with a quoted key is still the cause',
        code: `function walk(e) { const { 'cause': c } = e; walk(c); }`,
        errors: unbounded,
      },
      // Cause carried through a later assignment.
      {
        name: 'the cause carried through a later assignment is still the cause',
        code: `function walk(e) { let c; c = e.cause; walk(c); }`,
        errors: unbounded,
      },
      // AggregateError branch through flatMap.
      {
        name: 'the AggregateError branch through flatMap is an unguarded walk',
        code: `function walk(e) { return e.errors.flatMap(walk); }`,
        errors: unbounded,
      },
      // A named function expression is reported under its own name.
      {
        name: "a named function expression is reported under its own name, not the variable's",
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
        name: 'the walked error with a default value, tested and passed to helpers, is not guarded',
        code: `function walk(e = {}) { if (isError(e)) format(e); walk(e.cause); }`,
        errors: unbounded,
      },
      // The walked error in the errors.map shape, tested and passed to helpers.
      {
        name: 'the walked error in the errors.map shape, tested and passed to helpers, is not guarded',
        code: `function walk(e) { if (isError(e)) format(e); e.errors.map(walk); }`,
        errors: unbounded,
      },
      // A local whose .cause is read is walked too.
      {
        name: 'a local alias of the walked error whose cause is read is walked too',
        code: `function walk(e) { const x = e; if (isError(x)) format(x); walk(x.cause); }`,
        errors: unbounded,
      },
      // A marker written on another object does not mark the walked error.
      {
        name: 'a marker written on another object does not mark the walked error',
        code: `const MARK = Symbol();
      function walk(err) { if (MARK in err) return; other[MARK] = true; walk(err.cause); }`,
        errors: unbounded,
      },
      // A plain property write is not a marker.
      {
        name: 'a plain property write named after the marker is not a symbol marker',
        code: `const MARK = 'm';
      function walk(err) { if (MARK in err) return; err.MARK = true; walk(err.cause); }`,
        errors: unbounded,
      },
      // A depth changed by something other than + or - is not a bound.
      {
        name: 'a depth changed by multiplication is not a bound',
        code: `function walk(e, depth) { if (depth > 64) return; walk(e.cause, depth * 2); }`,
        errors: unbounded,
      },
      // A compared local that is not a parameter resets on every call.
      {
        name: 'a compared local that is not a parameter resets on every call',
        code: `function walk(e) { let d = 0; if (d > 3) return; walk(e.cause, d + 1); }`,
        errors: unbounded,
      },
    ],
  },
);
