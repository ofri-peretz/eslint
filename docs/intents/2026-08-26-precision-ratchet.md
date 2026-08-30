---
slug: precision-ratchet
opened: 2026-08-26
packages:
  - eslint-devkit
  - eslint-plugin-browser-security
  - eslint-plugin-conventions
  - eslint-plugin-express-security
  - eslint-plugin-import-next
  - eslint-plugin-jwt-security
  - eslint-plugin-lambda-security
  - eslint-plugin-maintainability
  - eslint-plugin-mcp-sdk-security
  - eslint-plugin-modernization
  - eslint-plugin-modularity
  - eslint-plugin-mongodb-security
  - eslint-plugin-node-security
  - eslint-plugin-operability
  - eslint-plugin-postgresql-security
  - eslint-plugin-react-a11y
  - eslint-plugin-react-features
  - eslint-plugin-reliability
  - eslint-plugin-secure-coding
  - eslint-plugin-vercel-ai-security
cases:
  - ILB-0001
  - ILB-0004
---

> **Reconstructed on 2026-08-30, after the work.** This branch ran for five days
> without an intent file, which is exactly the omission that produced this
> directory. It is recorded as reconstruction rather than backdated, because an
> intent file that pretends to have come first is worse than none — it makes
> the gate look satisfied while teaching nobody anything.
>
> The scope below is the diff's actual blast radius, not a prediction. Read it
> as an audit trail. Every later initiative gets a real one.

## What

Make a false positive or a miss into a **permanent, executable record** rather
than a fixed bug, and make every rule decide from structure rather than from
what a consumer happened to name a variable.

Three concrete changes a consumer notices:

- Rules read a static string wherever the value is statically known — a plain
  literal, a template literal, or a concatenation. 82 rules previously matched
  `'x'` and not `` `x` ``.
- Every hardcoded English vocabulary is either an option the consumer can
  **replace**, or it cites the external contract it comes from.
- `require-data-minimization` no longer guesses what PII is, and is inert
  until told. A major.

## Why

Evidence, not preference. Each of these came from an instrument, and each
instrument found what the others could not:

- A probe asking all 397 rules the same question found **1,156 sites** where a
  rule saw one spelling of a construct the grammar spells two ways.
- A rename litmus — rename every local binding to `foo1, foo2, …` — left
  **334 of 2,380** bindings changing rule behaviour, across 57 rules. Those are
  rules deciding from a name.
- A head-to-head against `eslint-plugin-security` on
  `detect-object-injection`, every number executed rather than asserted.
- An adversarial pass whose findings included **three cases where the rule was
  right and I was wrong** — `execFile('ls', [userInput])` really is CWE-88,
  `<nav role="navigation">` really is a deliberate default exception, and
  `DOMPurify?.sanitize(h) ?? h` really does hand the raw payload to innerHTML
  when the module is absent.

The underlying finding is that this repo's green checks were not all telling
the truth. Five separate gates were verifying nothing: a lock pointed at the
wrong directory, a registry entry that could not fail, a lock reading a stale
committed artifact, a changeset gate vouching for 20 packages on the strength
of 2, and a real-code inventory that predated its own scan config.

## Constraints

- **Precision before recall.** A false positive is spent on every build a
  consumer runs; a miss costs one finding. No change here may raise FP/kLoC on
  the real-source corpus.
- **AST-structural only.** A name is allowed only when it is somebody else's
  published contract, cited. `check:key-vocabulary` and
  `check:name-vocabulary` must both stay at **0**.
- **Ratchet, don't remediate.** 843 spelling sites and 14,935 undescribed cases
  are frozen debt. Refuse the next one; do not attempt to clear the backlog.
- **No gate may be weakened to make a change fit.** If a gate objects, either
  the change is wrong or the gate is — fix whichever, never bypass.
- **Every sealed case must fail on the unfixed rule.** A case that passes
  either way is not a seal.

## Done when

- `check:rule-cases`, `check:case-registry`, `check:spellings`,
  `check:key-vocabulary`, `check:name-vocabulary` all pass from a cold tree.
- Sealed FP + FN is **55** and open misses is **2** — down from 8.
- Every package with consumer-visible changes is named by a changeset.
  (Enforced by `check-changeset-coverage` as of this branch; it was the gate
  that let 18 of them through.)
- PR #739 reports SUCCESS on every required check.

## What this initiative did NOT set out to do

Recorded because the drift is the interesting part:

- Repairing CI (8 failures) and the release-readiness work were not planned —
  they were the cost of discovering the branch had never been through CI.
- `AI_SDLC.md`, the per-package changeset gate, and putting our own packages
  into `peer-health` came from a mid-flight request and belong to a different
  initiative. They are here because splitting the branch was declined, not
  because they were in scope.
