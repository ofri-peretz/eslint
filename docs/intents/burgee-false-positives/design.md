# Design — a consumer turned seven rules off

Intent: [`intent.md`](./intent.md). **Status:** review.

---

## Requirements

1. **R1** `no-missing-null-checks` treats `'k' in x` (x on the RIGHT) as
   proving `x` is an object in the consequent of the `if` or ternary it tests,
   and treats a truthy or `!= null` / `!== undefined` test on an optional chain
   rooted at `x` as proving `x` non-null. Equality to null/undefined, `x` on the
   left of `in`, a chain rooted elsewhere, and the alternate arm keep reporting.
2. **R2** Both `no-unhandled-promise` twins stop resolving a parameter to the
   function that declares it. A parameter is evidence only through what the file
   shows about it: a `() => Promise<…>` annotation or an async default.
3. **R3** The maintainability `no-missing-error-context` accepts the two shapes
   its reliability twin already accepts — a re-thrown identifier, and a custom
   `*Error` given a non-string argument — with identical source text.
4. **R4** `prefer-dependency-version-strategy`'s object-literal fallback treats
   an object as a dependency map only when every literal value is a version
   specifier. The `dependencies` / `devDependencies` / `peerDependencies`
   selector is unchanged.
5. **R5** `require-data-minimization` does not report an object whose every
   value is static — a literal, a file constant, or an array/object of those.
6. **R6** No `invalid` case in any of the five suites changes verdict.
7. **R7** FP 7 is recorded with evidence and left unfixed.
8. **R8** `consistent-function-scoping` treats a function whose only ancestors
   up to `Program` (or an export) are declarators, declarations and TypeScript
   type operators — `as`, `satisfies`, `!`, `<T>` — as already at module scope.
   The same cast inside a function keeps reporting.

## Design

### R1 — `no-missing-null-checks` (`packages/eslint-plugin-reliability/src/rules/reliability/no-missing-null-checks.ts`)

The rule already had two guard readers: `isNullCheckForObject` for the test of
an enclosing `if`, and a text-identity check for a ternary whose consequent
holds the read. Neither read the two forms TypeScript narrows on:

    'value' in token ? token.value : undefined      // in
    if (found?.[1] !== undefined) return found[1];  // optional chain

A new `narrowsToObject(test, object)` recognises exactly those:

- `BinaryExpression` with operator `in` whose RIGHT operand is the object or a
  prefix of it. `in` throws on null and undefined, so the consequent runs only
  with an object. The left operand is a key and narrows nothing.
- A `ChainExpression` whose root is the object, either as the whole test
  (truthy) or as the operand of `!==` / `!=` against `null` / `undefined`. An
  optional chain is non-nullish only when its root was.

It is called from `isNullCheckForObject` (so `if` tests and the `&&` / `||`
recursion pick it up) and from the ternary branch of `hasNullCheck`, in
addition to the text-identity it already had. `===` / `==` against nil is
deliberately not in it: `found?.[1] === undefined` passes when `found` is
null. Root matching is by source text, the same convention the truthy branch
of `isNullCheckForObject` uses (`objectText.startsWith(testText + '.')`).

The consumer's third shape — `if (m === null) return undefined; m[1]` — is
already understood on `main` through `isGuardedByEarlyExit` (4.1.4, #893).
Burgee runs 4.1.3. It is pinned here anyway, and proven red by swapping in the
4.1.3 rule source (below).

### R2 — `no-unhandled-promise` (both twins)

`resolveBinding` returned `def.node` for the first definition of a name.
For a `Parameter` definition `def.node` is the FUNCTION that declares the
parameter — so `write` inside `async function main(argv, write)` resolved to
`main`, `isAsyncFunctionNode(main)` was true, and every `write(…)` in the body
was an unhandled promise. The evidence gate that exists to stop the rule
reporting every call was answering yes for a reason unrelated to the callee.

The resolver now returns the parameter itself: its `AssignmentPattern.right`
when it has a default, else its `Identifier`. `hasPromiseEvidence` keeps
`isAsyncFunctionNode` (which now sees the async default) and adds
`isPromiseReturningAnnotation`: an `Identifier` whose type annotation is a
`TSFunctionType` returning `Promise<…>`. So:

    async function main(write: (s: string) => void) { write('x') }   // quiet
    async function main(write) { write('x') }                        // quiet
    async function main(save: () => Promise<void>) { save() }        // reports
    async function main(save = async () => {}) { save() }            // reports

Same edit, same text, in
`packages/eslint-plugin-maintainability/src/rules/error-handling/no-unhandled-promise.ts`
and `packages/eslint-plugin-reliability/src/rules/error-handling/no-unhandled-promise.ts`.

### R3 — `no-missing-error-context` (maintainability)

The two `hasErrorMessage` / `hasErrorStack` arms the reliability twin gained
earlier — an identifier that is not `undefined` / `NaN` / `Infinity` is a
re-throw and carries its own context; a non-string argument to a class whose
name ends in `Error` but is not `Error` is the context — are copied verbatim
into `packages/eslint-plugin-maintainability/src/rules/error-handling/no-missing-error-context.ts`.
The consumer's `throw new UsageError('missing required option', 'pass --x')`
was already quiet in both twins; what it saw under this plugin was
`throw err` at three sites and `new UsageError(msg, hint)`.

### R4 — `prefer-dependency-version-strategy` (`packages/eslint-plugin-conventions/src/rules/conventions/prefer-dependency-version-strategy.ts`)

The `ObjectExpression` fallback asked whether ANY property value looked like
`^1.2.3` or `workspace:`, then checked every property as a dependency. A
package.json fixture — `{ name: 'x', version: '1.0.0', main: 'index.js' }` —
and a vendoring record with `version: '1.0.0'` beside a repo URL, a commit and
a file count both qualified, and both reported `Dependency "version" should
use caret version`.

It now asks whether EVERY `Property` value is a string literal matching
`VERSION_SPECIFIER` — semver and ranges, `*` / `x`, the `latest` / `next`
dist-tags, and the `workspace:` / `file:` / `link:` / `npm:` / `git+` /
`github:` / `http(s):` protocols npm documents. A spread is skipped; any other
value (a name, a path, a date, a number, an array, an identifier) means the
object is not a dependency map and the fallback stands down. The keyed
selector for `dependencies` blocks is untouched, so the real map inside a
manifest still reports.

### R5 — `require-data-minimization` (`packages/eslint-plugin-operability/src/rules/operability/require-data-minimization.ts`)

After the existing breadth and `piiFields` checks pass, the rule now asks
whether the object collects anything. `isStaticValue` walks `ArrayExpression`
and `ObjectExpression` containers and hands every leaf to the devkit's
`isStaticExpression` — literals, template strings without expressions, and
constants declared in the file. An object whose every value passes is
configuration and is not reported; one value read from a request, a parameter
or a shorthand binding keeps the finding.

### R8 — `consistent-function-scoping` (`packages/eslint-plugin-maintainability/src/rules/maintainability/consistent-function-scoping.ts`)

`analyzeFunction` walks from the function to its enclosing scope to decide
whether there is anywhere higher to move it, stepping over `VariableDeclarator`
and `VariableDeclaration`. Burgee's `help.test.ts` had

    const noExit = (() => undefined) as unknown as (code: number) => never;

The parent chain is `TSAsExpression → TSAsExpression → VariableDeclarator →
VariableDeclaration → Program`; the walk stopped at the first `TSAsExpression`,
saw something that was not `Program`, and told the consumer to move an arrow to
the scope it was already in. The consumer hoisted the arrow into a `function`
declaration and lost the cast.

The two node types the walk stepped over become a `BINDING_WRAPPERS` set and
gain the four TypeScript type operators — `TSAsExpression`,
`TSSatisfiesExpression`, `TSNonNullExpression`, `TSTypeAssertion`. Each
re-describes the value's type and none moves it. The ancestor test after the
walk is unchanged, so `function outer() { const f = (() => 'ok') as unknown as
() => string; }` still reports: its walk ends at `outer`'s block.

The consumer's second FP 12 shape, `defineCommand({ run: () => 'ok' })`, is the
`Property` exemption that landed in 3.2.0. Burgee's lockfile resolves 3.2.3, so
the report it saw came from a test body on an earlier install; it is pinned
`valid` inside an `it(…)` callback, the shape 3.0.3 reported.

### R7 — `no-insecure-comparison`: recorded, not fixed

The consumer's comment attributes the block to identifiers containing `env`.
Against `main`, every shape it names is quiet: `env` is not in the secret
vocabulary, comparison to `undefined` is exempt, and `in` is not an operator
the rule reads. What `execute.ts` actually reports is

    for (const token of argv) { if (token === '--') …          // 204:9
    const { kind } = token; if (kind === 'option-terminator')  // 176:9, 177:14

`token` is in the closed secret vocabulary, and `namesIn` follows `kind` to
the binding it was destructured from. In a parser a token is a lexeme; the
rule cannot tell that from the AST, and the fix options are all worse than
the finding — see Rejected alternatives. The three shapes the comment names
are pinned as `valid` in the rule's test file so they stay quiet, and the
consumer's comment should say `token`.

## Verification

One command per package; each exits non-zero when this is wrong:

    cd packages/eslint-plugin-reliability     && npx vitest run
    cd packages/eslint-plugin-maintainability && npx vitest run
    cd packages/eslint-plugin-conventions     && npx vitest run
    cd packages/eslint-plugin-operability     && npx vitest run
    cd packages/eslint-plugin-secure-coding   && npx vitest run

**Red, on the unfixed rules** (new cases only; every existing case passed):

| Package         | Failing | Which                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| :-------------- | :------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| reliability     | 9       | `no-missing-null-checks`: the `in` ternary, the `in` if, `found?.[1] !== undefined`, truthy `found?.[1]`, `hit?.meta != null`, the `!== undefined` ternary. `no-unhandled-promise`: the void-typed writer, the untyped parameter, and the "local async beside a quiet parameter" invalid case reporting 2 instead of 1.                                                                                                                  |
| maintainability | 12      | `no-missing-error-context`: `new UsageError(msg, hint)`, `throw err`, `throw err` under `requireStackTrace`. `no-unhandled-promise`: the same three as above. `consistent-function-scoping`: the `as unknown as` cast, the same cast exported, `satisfies`, `!`, `<T>`, and a cast function expression — 6 of the 9 new cases; the inline-property pin and the two "same cast inside a function" invalid controls pass before and after. |
| conventions     | 4       | both fixtures, the manifest with correct dependencies, and the "dependencies block inside a manifest" invalid case reporting 2 (`version` + `react`) instead of 1.                                                                                                                                                                                                                                                                       |
| operability     | 2       | the `HOSTS` literal, and a literal whose values are file constants.                                                                                                                                                                                                                                                                                                                                                                      |
| secure-coding   | 0       | pins; the three shapes were already quiet. The positive control (`presented === process.env.ANTHROPIC_API_KEY`) reports.                                                                                                                                                                                                                                                                                                                 |

**Red against the version the consumer runs**, for the FP 1 early-return pins
that `main` already understands: with `git show eslint-plugin-reliability@4.1.3:…/no-missing-null-checks.ts`
swapped in, the `m[1]` and `m.at(1)` cases fail alongside the six above.

**Red against the version the consumer resolves**, for FP 12: the
`consistent-function-scoping` source at `eslint-plugin-maintainability@3.2.3`
is byte-identical to `main`'s and reports all five cast spellings. At 3.0.3 the
cast shapes were quiet — hidden by the `parent`-chain bug that made every arrow
look as though it captured — and `define({ run: () => 'ok' })` inside a
function reported.

**Green, after:** reliability 487/487 across 15 files; maintainability 494/494
across 21, 100% statements/branches/functions/lines; conventions 538 passed, 18
skipped, across 22; operability 138/138 across 10; secure-coding 3724/3724
across 83. `tsgo --build tsconfig.solution.json` and the maintainability package
build exit 0.

Test files:

- `packages/eslint-plugin-reliability/src/tests/reliability/no-missing-null-checks.test.ts` — describe `narrowing the consumer wrote and TypeScript accepts (burgee)`
- `packages/eslint-plugin-{maintainability,reliability}/src/tests/error-handling/no-unhandled-promise.test.ts` — describe `a parameter is not the function it belongs to (burgee)`
- `packages/eslint-plugin-{maintainability,reliability}/src/tests/error-handling/no-missing-error-context.test.ts` — describe `a custom Error subclass carries its own context (burgee)`
- `packages/eslint-plugin-conventions/src/tests/conventions/prefer-dependency-version-strategy.test.ts` — describe `an object with a version field is not a dependency map (burgee)`
- `packages/eslint-plugin-operability/src/tests/operability/require-data-minimization.test.ts` — run `a static literal collects nothing`
- `packages/eslint-plugin-secure-coding/src/rules/no-insecure-comparison/no-insecure-comparison.test.ts` — describe `environment lookups are presence checks, not secret comparisons (burgee)`
- `packages/eslint-plugin-maintainability/src/tests/maintainability/consistent-function-scoping.test.ts` — describe `a type assertion does not move a function off module scope (burgee)`

## Rejected alternatives

**Route the ternary test through `isNullCheckForObject` wholesale.** It would
have fixed `hit !== null ? hit.name : x` too, but that function also accepts
`obj === null` as a "null check", which in a ternary consequent is the
opposite of a guard. Only the new, direction-safe forms were added to the
ternary path; the pre-existing looseness of the `if` path is untouched and
out of scope.

**Make `resolveBinding` return `null` for every parameter.** Simplest, and it
would silence `async function main(save: () => Promise<void>) { save() }`,
where the file plainly shows a promise. The annotation and the default are
read instead, so the fix subtracts only the inference that was wrong.

**Exempt comparisons against a string literal from the timing finding** (for
FP 7). `token === '--'` would go quiet, and so would `presented === 'sk-live-…'`,
where the literal IS the secret and timing leaks it one character at a time.
That is a false negative on the rule's own CWE to buy silence on a lexer.

**Drop `token` from the secret vocabulary**, or match it only in an "auth
context". The first loses the single commonest credential name; the second
is the name-of-the-enclosing-function heuristic this rule removed on purpose
(see its own comment block). A consumer-owned vocabulary option is the honest
shape and is a separate intent.

**Gate `prefer-dependency-version-strategy`'s fallback on the filename** (skip
`*.test.ts`). It would have hidden the consumer's two cases and kept the
defect: a non-test file building a manifest object would still report its
`version`. The shape of the object is the evidence, not where the file sits.

**Exclude the key `version` from the fallback.** `version` is a real npm
package name, and it leaves `{ repo: 'r', tag: 'v1.0.0', … }` records reporting
on whichever other key happens to hold a semver string.

**Skip `require-data-minimization` when the object is `export const`.** Export
is not the evidence; a static literal is. `const HOSTS = [{…}]` inside a
function is the same configuration, and an exported object assembled from
`req.body` is still collection.

**Unwrap the type assertion and analyse the inner function as the binding's
value** (for FP 12), or exempt any function under a `TSAsExpression`. The first
is the same walk spelled from the other end; the second silences `const f =
(() => x) as T` inside a function, where the rule's one real job is. Stepping
over the operator and keeping the existing `Program` / export test subtracts
only the wrong stop.

**Extend the devkit's `isStaticExpression` to walk arrays and objects.** The
right long-term home, but it is consumed by every taint rule in the suite and
widening it there changes verdicts this intent did not measure. The container
walk lives in the one rule that needs it, delegating leaves to the devkit.

## Out of scope

- `no-unhandled-promise` (maintainability) lacking `isPromiseDelegatedToCaller`
  — `return promise.then(…)` and `return cond ? Promise.resolve(x).then(f) : f(x)`
  report in one twin and not the other (`commander-command.ts:909,1721,1725`).
  Noticed while measuring; its own intent.
- The `if` path of `isNullCheckForObject` accepting `=== null` as a guard.
- A consumer-owned secret vocabulary for `no-insecure-comparison`.
- Any change to burgee's repository.
