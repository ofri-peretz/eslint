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
