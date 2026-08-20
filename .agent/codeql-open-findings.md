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

**Our own rule does not report it**, and the reason I first gave was wrong.

I wrote that the oracle "may only ever REMOVE a finding, so recall is bounded by
`scslre`". Measured 2026-08-20 against the RULE rather than the analyser it is
built on, over all 2,136 regex literals in `packages/*/src` (730 re-embeddable
in a probe file; the rest do not survive extraction, a limit of the harness, not
the rule):

```
  the rule reports                    9
  recheck says vulnerable            41
  vulnerable, rule silent            32   = 31 polynomial deg 2 + 1 deg 3
                                          + ZERO exponential
```

Zero exponential missed. The rule's own correction layers —
`relaxBoundedRangesUnderUnboundedQuantifier` and `isProvablyCatastrophic` —
already recover the cases scslre clears, including `/^([a-zA-Z0-9]{2,4})+$/`,
which my first measurement listed as missed because that measurement ran raw
scslre + recheck and never ran the rule. Measuring a reduction of the thing and
reporting on the thing is the error this repo has a memory about; it recurred
here.

So the recall gap is not structural and not exponential. It is 31 second-degree
polynomials of the shape `/\s*,\s*/` and `/\s+\|/g`, plus one third-degree
identifier matcher. Reporting those would be the `effectiveFp` failure the seal
record already records as unmet.

**And the veto-only wiring is not a defect to fix — it is load-bearing.**
`recheck` is an OPTIONAL peer (`peerDependenciesMeta.recheck.optional`). If the
oracle could add findings, installing an unrelated optional package would change
whether a build passes. `confirmsRedos` fails open precisely so the oracle can
only ever subtract. Making it contribute requires promoting `recheck` to a hard
dependency first; that is a supply-chain decision, not a rule change.

Disposition: **no change**. SQL_COMMENTS is deg-2, so it stays unreported, which
agrees with the separate measurement that its textbook "linear" rewrite carries
the identical deg-2 verdict on identical output.

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
