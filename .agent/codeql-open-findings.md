# CodeQL / CodeRabbit findings open on PR #574

Recorded 2026-08-20. Nine review threads block the merge mechanically; every one
is marked outdated, meaning the line moved, not that the finding was answered.
This file answers them, so resolving the threads is a record rather than a
dismissal.

## The one that taught us something

Three postgresql-security rules share a SQL comment stripper:

```js
const SQL_COMMENTS = /--[^\n]*|\/\*[\s\S]*?\*\//g;
```

CodeQL calls it a polynomial ReDoS. So does `recheck` — **2nd degree
polynomial**, which matters because `recheck` is the oracle our own
`no-redos-vulnerable-regex` consults.

**Our own rule does not report it.** That is not a tuning gap, it is structural:
the oracle may only ever REMOVE a finding, so the rule's recall is bounded by
`scslre`, and anything scslre misses the oracle never gets asked about. We have
a second opinion wired to veto and not to contribute.

That is the finding worth keeping from this batch, and it is a design question
for the rule rather than a defect in these three files:

- Letting the oracle ADD findings would catch this class, at whatever precision
  cost `recheck`'s own false positives carry — unmeasured.
- Keeping it veto-only holds precision and accepts the recall bound.

Either way it should be a decision with a number attached, not an accident.

### Why the three files are not being rewritten today

The obvious linear rewrite is not one. Measured:

```
  before   vulnerable   2nd degree polynomial
  after    vulnerable   2nd degree polynomial     (classic /\*[^*]*\*+(?:[^/*][^*]*\*+)*\/ form)
  6/6 identical output on the shapes these rules parse
```

Both forms carry the same verdict, so the rewrite buys nothing but churn. And
the threat model is narrow: the "attacker input" is source code being linted,
so the worst case is a developer slowing their own build with their own file.
Timed at 16,000 repetitions of the trigger, the current pattern costs 0.1 ms.

Real, low-actionability, and recorded — which is exactly the effective-FP
category the seal record already lists as unmet for the ReDoS rule.

## The rest

| thread | finding | disposition |
|---|---|---|
| `eslint-devkit/ast/user-regex.ts` ×2 | polynomial ReDoS | our own rule DOES report these two — fix with the rule's own guidance |
| `eslint-devkit/ast/user-regex.test.ts` | exponential backtracking | a fixture: the pattern is the test subject |
| `scripts/codemod-inert-suggestions.ts` | file-system race | dev-only codemod, single-user, not shipped |
| `postgresql-security/prevent-double-release` | guard always false | dead code, cosmetic |
| `scripts/lint-name-inference.ts` (CodeRabbit) | functional correctness, Major | needs reading in full before acting |

## Not closed

Nothing here is claimed fixed. Two items are worth their own units of work: the
oracle's veto-only wiring, and the two devkit regexes our own rule flags — a
ReDoS rule shipping a ReDoS is the fault we police, and it should not survive a
release cycle.
