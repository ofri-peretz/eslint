---
title: no-unbounded-cause-recursion
description: Require a visited set or depth bound in a function that recurses down error.cause
tags: ['reliability', 'error-handling', 'recursion', 'cwe-674']
category: quality
severity: medium
cwe: CWE-674
autofix: false
---

> **Keywords:** error.cause, AggregateError, cause chain, cycle, circular reference, RangeError, Maximum call stack size exceeded, CWE-674, ESLint rule

<!-- @rule-summary -->

Require a visited set or depth bound in a function that recurses down error.cause
<!-- @/rule-summary -->

Detects a function that calls itself on `error.cause`, or maps itself over `error.errors`, with no visited set and no depth bound. This rule is part of [`eslint-plugin-reliability`](https://www.npmjs.com/package/eslint-plugin-reliability).

**Not in `recommended`.**

## Quick Summary

| Aspect            | Details                                                                             |
| ----------------- | ----------------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-674](https://cwe.mitre.org/data/definitions/674.html) (Uncontrolled Recursion) |
| **Severity**      | Medium (the error handler itself throws)                                            |
| **Auto-Fix**      | None                                                                                |
| **Category**      | Reliability                                                                         |
| **Best For**      | Error formatters, serializers, loggers and framework `catch` helpers                |

## Why this matters

`cause` is an ordinary property, so a cycle is one assignment away: `err.cause = err`, or two errors that cite each other. A function that recurses down the chain with nothing to stop it then throws `RangeError: Maximum call stack size exceeded`. It is almost always called from a `catch` block, so the RangeError replaces the error the code was handling, and the original is lost.

Two real cases have this shape: Node.js `assert.deepStrictEqual` on a self-referencing `cause` ([nodejs/node#67572](https://github.com/nodejs/node/issues/67572)), and `unstable_rethrow` in Next.js 16.4.6, which throws RangeError when called on an error whose cause points back to itself.

## Rule Details

A function is reported when it has a name it can call itself by (a declaration, a named function expression, or a `const` holding a function) and, in its own body, either:

- calls itself with an argument that reads `.cause`, or a variable destructured or assigned from `.cause`, or
- passes itself to an array method on `.errors` (`err.errors.map(walk)`),

and has no guard. A guard is:

- a collection the function both **looks up** (`.has`, `.get`, `.includes`) and **records into** (`.add`, `.set`, `.push`), whether a parameter, a local or a module-level `WeakSet`;
- a **memo kept through helpers**: a binding passed together with the walked error to a call inside an `if`, `?:` or `&&` test and to another call outside one (`if (mapHas(map, value)) …` then `mapSet(map, value, copy)`);
- a **marker** written on the walked error with a computed key (`err[seen] = true`) and tested (`seen in err`, or `hasOwnProperty.call(err.cause, seen)`); or
- a **depth bound**: a parameter compared with `<`, `<=`, `>` or `>=` and passed on changed (`depth + 1`, `level - 1`, `++depth`) in the recursive call. A local read from `arguments`, which is how a transpiler writes a default parameter, counts as a parameter.

The walked error itself is never a guard: `if (isError(e)) format(e)` tests and passes the error, but stops nothing.

A self-check such as `if (e.cause === e) return` is not a guard: two errors that cite each other still overflow.

## Examples

### ❌ Incorrect

```typescript
export function unstable_rethrow(error: unknown): void {
  if (isNextRouterError(error)) throw error;
  if (error instanceof Error && 'cause' in error) unstable_rethrow(error.cause);
}

const errorToErrorLike = (error) => ({
  message: error.message,
  cause: error.cause === undefined ? undefined : errorToErrorLike(error.cause),
});
```

### ✅ Correct

```typescript
export function unstable_rethrow(
  error: unknown,
  seen = new Set<unknown>(),
): void {
  if (seen.has(error)) return;
  seen.add(error);
  if (isNextRouterError(error)) throw error;
  if (error instanceof Error && 'cause' in error)
    unstable_rethrow(error.cause, seen);
}

function flatten(err: Error, depth = 0): string {
  if (depth > 10) return '…';
  return err.cause instanceof Error
    ? `${err.message}: ${flatten(err.cause, depth + 1)}`
    : err.message;
}
```

## Not a finding

- **A loop** (`while (e.cause) e = e.cause`) loops forever on a cycle instead of overflowing; it is out of this rule's scope.
- **A call to another function** on the cause, and recursion on anything other than `cause` or `errors`.
- **An anonymous function**, which cannot call itself by name.

## Known False Positives

### Data that cannot be cyclic for a reason outside the function

```typescript
// Reported, though the errors come from JSON.parse and cannot cite each other
function flattenUnion(e) {
  return e.kind === 'Union' ? { ...e, errors: e.errors.map(flattenUnion) } : e;
}
```

The rule cannot see where the walked value came from. **Mitigation:** add a depth bound, which costs one parameter, or disable the line with a comment naming the source.

## Known False Negatives

### Methods and mutual recursion

```typescript
// NOT DETECTED: recursion through `this`, or through a second function
class Formatter {
  format(e) {
    return e.cause ? this.format(e.cause) : e.message;
  }
}
```

**Mitigation:** Use the same guard: a `Set` of visited errors.

## Further Reading

- **[Error: cause on MDN](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error/cause)** — the property this rule follows
- **[CWE-674: Uncontrolled Recursion](https://cwe.mitre.org/data/definitions/674.html)** — Official CWE entry
