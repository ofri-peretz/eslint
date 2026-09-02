---
slug: a-resolved-name-is-not-a-cast
opened: 2026-09-02
packages:
  - eslint-devkit
  - eslint-plugin-browser-security
  - eslint-plugin-conventions
  - eslint-plugin-express-security
  - eslint-plugin-jwt-security
  - eslint-plugin-lambda-security
  - eslint-plugin-maintainability
  - eslint-plugin-mongodb-security
  - eslint-plugin-node-security
  - eslint-plugin-operability
  - eslint-plugin-postgresql-security
  - eslint-plugin-react-features
  - eslint-plugin-reliability
  - eslint-plugin-secure-coding
  - eslint-plugin-vercel-ai-security
cases: []
---

## What

Remove all **141 `propertyName(...) as string` sites across 82 rule files**
left by the computed-key sweep, and replace each with something that keeps the
unresolved case visible.

`propertyName` returns `string | null` on purpose: `o[k]` names a property the
AST cannot read, and that is a different answer from "named, and not the one we
want". `SET.has(propertyName(x) as string)` collapses the two — it works, because
`Set.prototype.has(null)` is false, but it reaches the right answer by lying to
the type system, and the next reader cannot tell which question was asked.

Two devkit helpers carry the distinction instead:

```ts
namesOneOf(name, names); // membership, null-safe, Set or array
memberPropertyName(node); // propertyName for a node that may not be a member
```

## Why

This is a readability debt with a correctness edge. Every one of these sites is
a place where a future change to `propertyName` — or a caller that starts
passing a node type it did not before — turns a silent `false` into a wrong
report, with no type error to catch it.

It is also the shape the repo has already been burned by: a cast that spells
"cannot happen" is the same move as an unreachable `?? ''` fallback, and
`CLAUDE.md` records those being removed rather than covered.

## How

Three transforms, chosen per site rather than applied uniformly:

1. **Membership** (90 sites) — `SET.has(propertyName(x) as string)` becomes
   `namesOneOf(propertyName(x), SET)`. Structurally identical, so no branch
   moves.
2. **The guard already proved it** (report `data:`, `string | null` returns) —
   drop the cast and let the value keep its type. ESLint report `data` takes
   `unknown`, and several of these functions already declared `string | null`.
3. **The guard needs the value afterwards** — resolve once, _before_ the
   boolean chain, with `memberPropertyName`, and give the chain a binding to
   test.

## The constraint that decided the shape

**Do not split an existing `&&` / `||` chain into statements.** Istanbul counts
a logical operand as covered once it is EVALUATED, not once each outcome
occurs. A type test that is never false inside a chain therefore reads as fully
covered; promoting it to `if (...) return;` exposes an arm no test reaches and
drops the package below its 100% gate.

This is not theoretical — the first attempt at the four `*-innerhtml` rules did
exactly that and cost 4 statements and 4 branches. Transform 3 exists to add a
binding without adding a statement.

## How we will know it worked

1. `grep -rn "propertyName(.*) as string" packages/*/src --include=*.ts | grep -v test`
   returns nothing.
2. Every touched package still at 100% coverage, with an **unchanged test
   count** — the refactor changes no rule behaviour, so no test may move.
   `eslint-devkit` is the sole exception: +7, covering the two new helpers.
3. `npm run check:computed-keys` still reports 0 rules going silent.
4. `npx tsx scripts/rule-audit-gate.ts` reports no regressions.

## Outcome

Shipped 2026-09-02. 141 → 0 sites. Every package's test count unchanged;
`eslint-devkit` 1845 → 1852. `check:computed-keys` 0 silent rules across 2,151
probed TP cases; `rule-audit-gate` 121 rules, no regressions.

One instrument needed repair on the way: `rule-audit.ts` decided a rule "uses
membership" by grepping its `create()` body for `.has(` / `includes(` / `some(`.
Moving the test behind `namesOneOf` made four `browser-security` rules drop
their `unconfigurable-vocabulary` finding while their word lists stayed exactly
as unconfigurable as before — the helper-shaped evasion `CLAUDE.md` names for
the name-inference gate, arriving unbidden. `namesOneOf(` is now in that
detector's alternation.
