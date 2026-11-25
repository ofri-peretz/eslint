/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
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

ruleTester.run('no-unbounded-cause-recursion', noUnboundedCauseRecursion, {
  valid: [
    // Node.js lib/internal/assert/assertion_error.js after the #67572 fix:
    // a map of copies, looked up and written.
    {
      name: 'a Map of copies looked up before and written after the recursive call stops a cause cycle (Node.js assertion_error after #67572)',
      code: `function copyError(source, copies = new Map()) {
      const copy = copies.get(source);
      if (copy !== undefined) return copy;
      const target = Object.assign({}, source);
      copies.set(source, target);
      let { cause } = source;
      if (cause instanceof Error) cause = copyError(cause, copies);
      target.cause = cause;
      return target;
    }`,
    },
    // A module-level WeakSet.
    {
      name: 'a module-level WeakSet tested and added to before following the cause bounds the walk',
      code: `const seen = new WeakSet();
    function rethrow(error) {
      if (seen.has(error)) return;
      seen.add(error);
      if (isNextError(error)) throw error;
      if (error instanceof Error && 'cause' in error) rethrow(error.cause);
    }`,
    },
    // An array used as the visited list.
    {
      name: 'an array used as the visited list, tested with includes and pushed to, bounds the walk',
      code: `function chain(e, seen = []) {
      if (seen.includes(e)) return seen;
      seen.push(e);
      return e.cause ? chain(e.cause, seen) : seen;
    }`,
    },
    // A depth bound, compared and passed on changed.
    {
      name: 'a depth parameter compared and passed on changed bounds the recursion',
      code: `function flatten(err, depth = 0) {
      if (depth > 10) return '';
      return err.cause ? err.message + ': ' + flatten(err.cause, depth + 1) : err.message;
    }`,
    },
    {
      name: 'an arrow function that stops at level <= 0 and passes level - 1 is depth-bounded',
      code: `const describe = (e, level) => level <= 0 ? '' : e.message + describe(e.cause, level - 1);`,
    },
    // Recursion on something other than a cause.
    {
      name: 'recursion over node.children is not a walk of a cause chain',
      code: `function walk(node) { for (const child of node.children) walk(child); }`,
    },
    // A loop, not recursion: out of scope for this rule.
    {
      name: 'a while loop over e.cause is not recursion and is out of scope',
      code: `function root(e) { while (e.cause) e = e.cause; return e; }`,
    },
    // Calls another function on the cause: not self-recursion.
    {
      name: 'calling a different function on the cause is not self-recursion',
      code: `function report(e) { log(e); if (e.cause) other(e.cause); }`,
    },
    // An anonymous function cannot call itself by name.
    {
      name: 'an anonymous default-exported function cannot call itself by name',
      code: `export default function (e) { return e.cause; }`,
    },
    // A nested callback that recurses is judged as its own function, not the outer one.
    {
      name: 'a recursive callback nested in an outer function is judged as its own function, not the outer one',
      code: `function outer(e) { return [e].map(function inner(x) { return x.message; }); }`,
    },
    // A name that shadows the function inside it is not the function.
    {
      name: 'a local that shadows the function name is not the function, so calling it is not recursion',
      code: `function walk(e) { const walk = (x) => x; return walk(e.cause); }`,
    },
    // pino-std-serializers err-with-cause: a symbol marker written on each
    // error and tested before following its cause.
    {
      name: 'a symbol marker written on each error and tested before following its cause bounds the walk (pino-std-serializers err-with-cause)',
      code: `const seen = Symbol('seen');
    function errWithCauseSerializer(err) {
      err[seen] = undefined;
      const out = { message: err.message };
      if (err.cause && !Object.prototype.hasOwnProperty.call(err.cause, seen)) {
        out.cause = errWithCauseSerializer(err.cause);
      }
      return out;
    }`,
    },
    // core-js structured-clone: a memo map read and written through helpers.
    {
      name: 'a memo map read and written through helper functions bounds the clone (core-js structured-clone)',
      code: `function cloneInternal(value, map) {
      if (map) {
        if (mapHas(map, value)) return mapGet(map, value);
      } else map = new Map();
      const cloned = { message: value.message };
      mapSet(map, value, cloned);
      if (value.cause) cloned.cause = cloneInternal(value.cause, map);
      return cloned;
    }`,
    },
    // A marker tested with `in`.
    {
      name: 'a symbol marker tested with the in operator before the cause is followed bounds the walk',
      code: `const SEEN = Symbol();
    function walk(e) { if (SEEN in e) return; e[SEEN] = 1; if (e.cause) walk(e.cause); }`,
    },
    // axe-core: a depth bound written by a transpiler as a local read from `arguments`.
    {
      name: 'a depth bound written by a transpiler as a local read from arguments and compared bounds the walk (axe-core)',
      code: `function serializeError(err) {
      var iteration = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
      const serial = { message: err.message };
      if (err.cause) serial.cause = iteration < 10 ? serializeError(err.cause, iteration + 1) : '...';
      return serial;
    }`,
    },
  ],
  invalid: [
    // Node.js copyError before the fix (destructured cause, then reassigned).
    {
      name: 'Node.js copyError before the fix: a destructured cause reassigned from the recursive call has no visited set',
      code: `function copyError(source) {
        const target = Object.assign({}, source);
        let { cause } = source;
        if (isError(cause)) cause = copyError(cause);
        target.cause = cause;
        return target;
      }`,
      errors: unbounded,
    },
    // Next.js unstable_rethrow (16.4.6).
    {
      name: 'Next.js unstable_rethrow follows error.cause with no guard (16.4.6)',
      code: `export function unstable_rethrow(error) {
        if (isNextRouterError(error) || isBailoutToCSRError(error)) throw error;
        if (error instanceof Error && 'cause' in error) unstable_rethrow(error.cause);
      }`,
      errors: unbounded,
    },
    // eventsource flattenError: both a cause and an AggregateError's errors.
    {
      name: 'eventsource flattenError recurses on both the AggregateError errors and the cause with no guard',
      code: `function flattenError(err) {
        return err instanceof Error
          ? 'errors' in err && Array.isArray(err.errors)
            ? err.errors.map(flattenError).join(', ')
            : 'cause' in err && err.cause instanceof Error
              ? \`\${err}: \${flattenError(err.cause)}\`
              : err.message
          : \`\${err}\`;
      }`,
      errors: unbounded,
    },
    // Only the AggregateError branch.
    {
      name: "recursing only through an AggregateError's errors, with no cause involved, is still unbounded",
      code: `function messages(err) { return [err.message, ...err.errors.flatMap(messages)]; }`,
      errors: unbounded,
    },
    // Storybook errorToErrorLike, as a const arrow.
    {
      name: 'Storybook errorToErrorLike written as a const arrow follows the cause unguarded',
      code: `const errorToErrorLike = (error) => ({
        message: error.message,
        cause: error.cause === undefined ? undefined : errorToErrorLike(error.cause),
      });`,
      errors: unbounded,
    },
    // A named function expression.
    {
      name: 'a named function expression that calls itself by its own name on the cause is unbounded',
      code: `const f = function walk(e) { return e.cause ? walk(e.cause) : e; };`,
      errors: unbounded,
    },
    // A variable assigned from the cause first.
    {
      name: 'a variable assigned from e.cause and passed to the recursive call is the cause',
      code: `function last(e) { const next = e.cause; return next ? last(next) : e; }`,
      errors: unbounded,
    },
    // A self-check is not a guard: two errors that cite each other still overflow.
    {
      name: 'a self-check (e.cause === e) is not a guard: two errors that cite each other still overflow',
      code: `function walk(e) { if (e.cause === e) return e; return e.cause ? walk(e.cause) : e; }`,
      errors: unbounded,
    },
    // A set that is only written, never looked up, guards nothing.
    {
      name: 'a Set that is only added to and never looked up guards nothing',
      code: `function walk(e, seen = new Set()) { seen.add(e); return e.cause ? walk(e.cause, seen) : seen; }`,
      errors: unbounded,
    },
    // A depth parameter passed on unchanged bounds nothing.
    {
      name: 'a depth parameter passed on unchanged bounds nothing, even when compared',
      code: `function walk(e, depth) { if (depth > 5) return; walk(e.cause, depth); }`,
      errors: unbounded,
    },
    // A depth passed on changed but never compared bounds nothing.
    {
      name: 'a depth passed on changed but never compared bounds nothing',
      code: `function walk(e, depth = 0) { log(depth); if (e.cause) walk(e.cause, depth + 1); }`,
      errors: unbounded,
    },
    // A cause read through a computed key.
    {
      name: "a cause read through a computed key e['cause'] is still the cause",
      code: `function walk(e) { if (e['cause']) walk(e['cause']); }`,
      errors: unbounded,
    },
    // The walked error tested and passed to helpers is not a guard.
    {
      name: 'the walked error tested and passed to helper functions is not a guard',
      code: `function walk(e) { if (isError(e)) format(e); if (e.cause) walk(e.cause); }`,
      errors: unbounded,
    },
    // The same, with the walked error passed to a helper in a `?:` test.
    {
      name: 'the walked error passed to a helper in a ?: test is not a guard',
      code: `function walk(e) { log(e); return isError(e.cause) ? walk(e.cause) : e; }`,
      errors: unbounded,
    },
    // An option only tested, never recorded, guards nothing.
    {
      name: 'an option that is only tested and never recorded guards nothing',
      code: `function walk(e, opts) { if (skip(opts)) return; if (e.cause) walk(e.cause, opts); }`,
      errors: unbounded,
    },
    // An option only passed on, never tested, guards nothing.
    {
      name: 'an option that is only passed on and never tested guards nothing',
      code: `function walk(e, opts) { log(opts); if (e.cause) walk(e.cause, opts); }`,
      errors: unbounded,
    },
    // A marker written but never tested guards nothing.
    {
      name: 'a marker written on the error but never tested guards nothing',
      code: `const SEEN = Symbol(); function walk(e) { e[SEEN] = 1; if (e.cause) walk(e.cause); }`,
      errors: unbounded,
    },
    // A local not read from `arguments` is not a depth parameter.
    {
      name: 'a local counter not read from arguments is not a depth parameter',
      code: `function walk(e) { let d = 0; if (d < 10 && e.cause) walk(e.cause, d + 1); }`,
      errors: unbounded,
    },
    // A local read from `arguments` but passed on unchanged bounds nothing.
    {
      name: 'a local read from arguments but passed on unchanged bounds nothing',
      code: `function walk(e) { var d = arguments[1] || 0; if (d < 10 && e.cause) walk(e.cause, d); }`,
      errors: unbounded,
    },
    // jest/playwright buildSerializeError: a loop key written on a result and
    // tested with includes is not a marker on the error.
    {
      name: 'jest/playwright buildSerializeError: a loop key written on a result and tested with includes is not a marker on the error',
      code: `function buildSerializeError(error) {
      const result = {};
      for (const name of Object.getOwnPropertyNames(error)) {
        if (['stack'].includes(name)) continue;
        if (name === 'cause') { result[name] = buildSerializeError(error['cause']); continue; }
        result[name] = error[name];
      }
      return result;
    }`,
      errors: unbounded,
    },
    // A config tested and passed to helpers without the error guards nothing.
    {
      name: 'a config tested and passed to helpers, without the error being tested, guards nothing',
      code: `function format(error, config) {
      if (useColor(config)) paint(config);
      if (error.cause) return format(error.cause, config);
      return render(error.message, config);
    }`,
      errors: unbounded,
    },
  ],
});
