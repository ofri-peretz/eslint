---
slug: the-rename-litmus-passes
opened: 2026-08-30
packages: []
cases: []
---

## What

Take the rules that still decide from an identifier's spelling and either give
the consumer an option to replace the vocabulary, or record the external
contract the name comes from.

The probe renames every local binding to `foo1, foo2, …` and re-runs the suite.
Last run: **2,046 of 2,380 renamed bindings left behaviour unchanged (85%);
334 did not, across 57 rules.**

## Why

"AST-structural only" is the repo's loudest claim about how its rules work, and
it is the thing that separates a rule from a dictionary. `CASE_PHILOSOPHY.md`
states the litmus in one line: rename every variable to `foo` — does the rule
still fire?

For 57 rules the answer is no, and each is a false positive waiting for a
consumer who names things differently. `require-data-minimization` treated
`name` and `address` as personal data — `name` is the commonest property name
in JavaScript — and reported on every one of them until it was made
configurable.

The distinction that decides each case is already settled and written down:

- A name **somebody else publishes** may be hardcoded, and must cite them.
  `req.query`, `dangerouslySetInnerHTML`, `sk_live_`, `AKIA` are contracts.
- A guess at what the **consumer** calls their own binding is an **option**,
  and replacing the default has to be possible.

`check:key-vocabulary` and `check:name-vocabulary` both sit at 0, so the
inline-list form of this debt is paid. The 334 are the remaining form: names
read structurally rather than from a list.

## Constraints

- **An option REPLACES the default, never extends it.** A default that cannot
  be removed is still an assertion about somebody else's codebase.
- Every retained hardcoded name carries a `@vocabulary` comment naming the
  authority. A name we cannot attribute is a guess, and a guess in a default is
  a claim we are not entitled to make.
- Adding an option is a **minor**; making a rule inert without one is a
  **major** and needs the exact restoring config in its changeset, as
  `require-data-minimization` did.
- Precision may not fall. Each change is measured against the corpus before and
  after — a rule made configurable but noisier is a worse rule.
- The probe is the arbiter, not intuition. A rule is done when renaming its
  bindings stops changing its output.

## Done when

- Rules failing the rename litmus: **57 → under 25**.
- Every remaining one either exposes a replaceable vocabulary option or carries
  a `@vocabulary` citation.
- `npm run check:name-vocabulary` stays at 0 and the probe's structural share
  rises from 85%.
- The new figure replaces 85% in `AI_SDLC.md`.

## Outcome — 2026-08-30, and a corrected target

**The target in this intent was wrong.** "Rules failing the rename litmus:
57 → under 25" counted sanctioned name-dependence as debt.
`no-hardcoded-credentials` reads names and exposes `credentialWords`, which is
the approved form — it is in the probe's list and always will be. Driving that
number down would mean deleting legitimate behaviour.

What measuring found instead was an instrument defect. `check:name-vocabulary`
chose which rules to inspect with:

```ts
if (!NAME_HELPERS.some((helper) => text.includes(helper))) continue;
```

`NAME_HELPERS` is `['makeNameTest', 'identifierWords']`. Of the 25 most
name-dependent rules in the suite, **three import those helpers and 22 do
not** — so the gate skipped nearly everything it existed to check. Its reported
**0** meant "no rule _using the helpers_ lacks a replaceable vocabulary", which
reads like a far stronger claim than it is.

A second static pattern would not have fixed it: `check:key-vocabulary` already
covers inline property-name lists, and an open-coded `n === 'secret'` can be
written a dozen ways. So the gate now reads the PROBE, which settles the
question by experiment rather than by pattern — the litmus this intent is named
after.

The probe commits `benchmarks/budgets/name-dependence.json` with the hash of
the script that produced it, and the gate refuses to report when that hash does
not match. That lesson came from `real-world-rule-inventory.json`, which sat
with the right date and the wrong instrument for four days while "270 rules
never fire" was quoted as fact.

**Corrected numbers.** Rules the probe finds name-dependent: **56**. Of those,
**24** expose a replaceable vocabulary or cite an authority; **32** do neither.
The gate went **0 → 32 offenders**, baselined shrink-only. That is not a
regression — it is the first honest reading.

**Corrected target: 32 → 0.** Each rule gets a replaceable option or a
`@vocabulary` citation. Draining it is the remaining work; the ratchet now makes
a 33rd impossible.

Two limitations are stated in the script header rather than hidden. The gate
asks "does this rule expose SOME replaceable vocabulary", not "one for the
vocabulary it actually decided from" — found by sabotage, where renaming
`credentialWords` out of `no-hardcoded-credentials` left it compliant because
`placeholderWords` still matched. And one `@vocabulary` comment exempts a whole
file. Closing either needs a map from option to governed names, which is a
dataflow question. The gate is a floor, not a certificate.

One more vacuous pass fell out of this. `freshness-has-a-refresher.test.ts`
reduced an `npx tsx scripts/x.mts` refresh command to the literal string
`"npx"`, which every workflow file contains — so every npx-shaped refresher
passed without anything running it. Fixing the extraction immediately exposed
two: the new probe artifact, and `real-source-scan.mts`, which I had added to
the freshness gate earlier the same day. The probe now runs in the monthly
refresh workflow; the corpus scan is baselined with its reason, because cloning
112 repositories is not a cron job.
