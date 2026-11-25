# Design — `reliability/no-unbounded-cause-recursion`

**Intent:** [intent.md](./intent.md) · **Status:** built in the PR that adds this file, for review

## Requirements

1. Report a function that calls itself on an error's `cause`, or passes itself to an array
   method over `.errors`, when the function has no structural guard.
2. Stay silent on a loop walk, on recursion down any other property, and on a guarded walk.
3. Decide recursion and guards through scope resolution, never by name.

## Design

- **Self binding.** A function declaration's or named function expression's own id, or the
  `const` / `let` declarator that holds a function; resolved with `getDeclaredVariables`, so a
  shadowing local of the same name is not the function.
- **Cause recursion**, in the function's own body (nested functions are judged on their own):
  - a call to the self binding with an argument that reads `.cause` (dot or `['cause']`), or a
    variable whose declarator reads `.cause`, destructures `{ cause }`, or is later assigned
    one;
  - `x.errors.<map|flatMap|forEach|filter|some|every|find|reduce>(self)`.
- **Guard.** Any one of:
  - a binding both looked up (`has`, `get`, `includes`) and recorded (`add`, `set`, `push`);
  - a binding passed **with the walked error** to a call inside an `if` / `?:` / `&&` test and
    to another call outside one (core-js `mapHas(map, value)` … `mapSet(map, value, copy)`);
  - a marker key written on the walked error (`err[seen] = …`) and tested (`seen in x`, or
    passed with the error to a call in a test, as pino does with `hasOwnProperty.call`);
  - a parameter, or a local read from `arguments` (a transpiled default), compared with
    `< <= > >=` and passed changed (`± n`, `++`) in a recursive call.
    The walked error itself never counts as a guard, so `if (isError(e)) format(e)` is not one.
- **Severity / preset.** `strict`, CWE-674, no CVSS: the intent classes it as reliability.

## Evidence

- RuleTester: 72 cases, all pass on ESLint and oxlint.
- Fidelity model `reliability/no_unbounded_cause_recursion`: 6 walk shapes × 10 guards × 3
  function forms = 180 inputs, run on Quint's TypeScript backend.
- Corpus: `benchmarks/corpus/CWE-674`, two vulnerable fixtures (Next's `unstable_rethrow`
  shape, Node's `copyError` before the fix) and two safe twins (a memo map, a depth bound).
- `node_modules` scan, 2026-11-25 (429 files that read `.cause` or iterate `.errors`): the
  first build reported 48 sites. Three were false positives and are fixed in this PR, each
  with a test: pino's symbol marker, core-js's helper-wrapped memo map, and axe-core's
  transpiled default depth. The 44 left are 15 distinct functions (the rest are copies in
  other bundles):
  - 13 overflow on a cyclic cause: Next `unstable_rethrow` (reproduced on 16.4.6), eventsource
    `flattenError`, vitest `printErrorInner`, Storybook `errorToErrorLike`, `errorLikeToError`
    and `isInterruptionError`, and Playwright's `filterStackTrace`, `formatError`,
    `toTestInfoErrorPayload`, `serializeLoadErrors`, `formatExecError`, `formatErrorStack`
    and `buildSerializeError`;
  - 2 walk data that cannot be cyclic for a reason the rule cannot see: Prisma maps its
    union validation errors parsed from engine JSON, and PostHog's `append` walks a tree its
    own `parseStacktrace` built. Both are listed under Known False Positives in the rule doc.

## Rejected alternatives

- **A self-check (`if (e.cause === e) return`) as a guard.** Two errors that cite each other
  still overflow, so it bounds nothing.
- **Any binding named `seen`, `visited` or `depth`.** Ruled out by the name-inference gate,
  and a write-only set is common: it records but never stops the walk.
- **Reporting loop walks (`while (e) e = e.cause`).** A cycle there hangs instead of
  overflowing, and telling a bounded loop from an unbounded one by structure needs loop
  analysis this rule does not do; listed as a known false negative.
- **Methods (`this.parseStacktrace(err.cause)`).** `this` cannot be resolved to the method by
  scope, so method recursion is a known false negative rather than a name match.

## Non-goals

- Auto-fix: the right guard (a `WeakSet`, a memo map, a depth limit) depends on what the walk
  returns.
