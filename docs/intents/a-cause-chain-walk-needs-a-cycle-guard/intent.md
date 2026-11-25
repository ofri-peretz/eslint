---
slug: a-cause-chain-walk-needs-a-cycle-guard
opened: 2026-11-25
packages:
  - eslint-plugin-reliability
  - oxlint-plugin-reliability
cases: []
---

# Intent — a function that recurses down `error.cause` needs a cycle guard

> Stage 1 artifact. Opened from Node.js issue #67572 and a stack overflow
> reproduced in Next.js 16.4.6 on 2026-11-25.

**Status:** draft · **Opened:** 2026-11-25 · **Owner:** @ofri-peretz

---

## What is wanted

A proposed rule, `no-unbounded-cause-recursion`, reports a named function that
calls itself on `x.cause` (or `x.errors[i]` of an `AggregateError`) with no
visited set and no depth bound. `error.cause` is an ordinary property: a cycle
(`e.cause = e`, or two errors that cite each other) is one assignment away, and
the walk then ends in `RangeError: Maximum call stack size exceeded`, thrown
from inside the code that was trying to report the first error.

## Why now

- Node.js issue #67572: `assert.deepStrictEqual` throws RangeError on a
  self-referencing `cause`, from `copyError` in
  `lib/internal/assert/assertion_error.js`, which recurses on `source.cause`
  with no memo. A fix with a `SafeMap` of copies is prepared upstream.
- Reproduced 2026-11-25 on Next.js 16.4.6 (this repo's `node_modules`):
  `unstable_rethrow(e)` with `e.cause = e` throws `RangeError: Maximum call
stack size exceeded` (`next/dist/client/components/unstable-rethrow.js`).
  `unstable_rethrow` is called in `catch` blocks of app code, so the overflow
  replaces the error being handled.
- Measured 2026-11-25 over this repo's `node_modules` (same acorn scan as
  `a-uri-decode-on-request-input-is-a-crash`): 26 named functions recurse with
  an argument that reads `.cause`. 11 carry something that looks like a guard
  (a `Set`/`Map`, `seen`, `visited`, `depth`, `level`); 15 do not, among them
  Next's `unstable_rethrow`, `eventsource`'s `flattenError`, Storybook's
  `errorToErrorLike` and Playwright's `filterStackTrace` and `formatError`. The
  guard test in that scan is a text match, so 11 is an upper bound on guarded.

## Affected users and systems

`eslint-plugin-reliability` and its oxlint alias, the rule's docs page and the
generated docs site pages. No existing rule changes.

## Constraints

- Recursion is resolved through the scope manager: the callee must be the
  enclosing function's own binding, not a name that matches it.
- A guard is structural: a `Set`, `WeakSet`, `Map` or `WeakMap` that the walk
  both checks (`.has`) and writes (`.add`/`.set`) on the path to the recursive
  call, or a numeric parameter compared against a bound and passed on changed.
  A variable named `seen` with neither is not a guard.
- An iterative walk (`while (e) { e = e.cause }`) loops forever on a cycle
  instead of overflowing. It is in scope only if the design can tell a bounded
  loop from an unbounded one by structure; otherwise it is a non-goal.
- Severity is a reliability problem, not a security finding: no CWE-400 claim
  unless a caller can be shown to control the cycle.

## Success criteria

- RuleTester: the `copyError` shape before the Node fix reports and after it
  does not; Next's `unstable_rethrow` shape reports; the same function with a
  `WeakSet` checked and written does not; a depth-bounded twin does not.
- Fidelity model `reliability/no_unbounded_cause_recursion` passes with 0
  divergences.
- Over the same `node_modules` scan, every report is one of the 15 unguarded
  sites read by hand as a real overflow on a cyclic cause, or is written up as
  a false positive and fixed before the rule ships.

## Open questions

- Is one report per function right when the function recurses on both `cause`
  and `errors`, or should it be one per recursive call?
- Do we offer the Next.js and eventsource maintainers the fix (a `WeakSet`)
  once the rule exists, credited to the rule?
