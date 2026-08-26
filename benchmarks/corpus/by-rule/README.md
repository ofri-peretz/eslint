# Per-rule fixtures

One verified true positive and up to three true negatives for each rule,
derived from that rule's own RuleTester cases.

**211 of 374 rules** are represented here. Every set was kept only after the
vulnerable fixture was confirmed to actually reproduce — a fixture that does not
demonstrate the thing it claims is worse than no fixture, so 152 sets that
extracted cleanly but did not fire were deleted rather than committed.

## What these can and cannot measure

They **cannot** measure the precision of their own rule. The fixture is the
rule's own test case, so the rule passes it by construction. Any precision
number computed that way is 100% and means nothing. This directory is therefore
**not scored** by `benchmarks/score.ts`, which reads only the `CWE-NNN/`
directories.

What they measure is the thing unit tests structurally cannot: **cross-rule
interference**. With every rule's material in one corpus, a rule that fires on
another rule's safe fixture is a false positive that no per-rule test suite
would ever surface.

Only fixtures under `CWE-NNN/` — hand-reviewed, and increasingly sourced from
real third-party code — count toward the published precision figure. See
`benchmarks/PRECISION_GOAL.md`.

## Why 163 rules are missing

| reason | rules | fix |
| :--- | ---: | :--- |
| TP extracted but did not reproduce standalone | 152 | the suite transforms code through a helper — `express-security` wraps every case with `import 'express';` so the rule sees module evidence. Reproducing these means executing the helper, not parsing it. |
| no `invalid` case exists at all | 2 | `import-next/no-relative-packages` and `secure-coding/no-bidi-characters`. Listed in `no-true-positive.json`. |

The second row was first reported as 25 rules. That was wrong, and the way it was
wrong is worth recording: the extractor read only string literals and template
literals, so every case written as `code: DRIVER + '...'` — the common way these
suites prepend a driver import — was skipped, and the silence was read as
absence. It is the same failure the benchmark scorer had, where a crashed run
returned zero findings instead of an error. A tool that cannot distinguish "none"
from "could not read" will eventually be believed.

## Provenance

Every file carries `@origin rule-tests` and a `@caution` noting it cannot score
its own rule. Cases that were tested with `options` carry them back as an inline
`/* eslint rule: ["error", …] */` comment, without which the rule runs on
defaults it was never tested under — that alone was the difference between 208
and 211 reproducing.
