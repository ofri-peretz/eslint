---
slug: the-silence-instrument-is-recorded
opened: 2026-08-30
packages: []
cases: []
---

## What

Make `real-world-rule-inventory.json` say which instrument produced it, and
refuse to be read when that instrument has changed. Then re-run it.

Until this lands, **"110 rules have no evidence" is not a number** — it is a
number-shaped object, and the largest block inside it is known to be an
artifact.

## Why

`scripts/real-source-scan.mts` already documents this exact failure, in its own
header, about this exact plugin:

> `eslint.real-source.config.mjs` was introduced on 2026-08-26 because the
> previous config matched `**/*.js` with no TypeScript parser and never linted
> a single `.tsx` file — and the inventory committed fourteen hours AFTER that
> fix still carried the pre-fix numbers. So `react-a11y` read as "37 rules that
> never fire on real code" when the truth was "37 rules nobody ran": the current
> config produces eight react-a11y findings from a ten-line JSX file.

The header then says the remedy:

> Nothing about the stale file looked stale. Recording the hash is what makes
> that state detectable.

**The hash is not recorded.** `CONFIG_HASH` is computed in the script and never
written to the artifact. `real-world-rule-inventory.json` has no `configHash`
field, is dated `2026-08-26` — the same day the config was fixed at 07:57 — and
therefore nobody can say whether the committed numbers describe the current
instrument or the broken one.

So the defect the comment describes as fixed is undetectable by the mechanism
written to detect it. That is a fourth instance of the shape this repo keeps
finding: **a control that is described, and not wired up.** The others were four
npm scripts that did not exist, a freshness test that reduced a refresh command
to the string `"npx"`, and a refresher that audits without refreshing.

And 37 of the 110 rules with "no evidence of any kind" are react-a11y — the
precise block the header says was never run.

## Constraints

- The hash covers **both** inputs, not just one: the ESLint config AND
  `benchmarks/real-source-repos.json`. A scan of a different repo list is a
  different measurement, and a rule that is silent because the corpus changed is
  not a rule that stopped working.
- The gate **refuses to report** on a mismatch rather than reporting with a
  warning. A stale number that prints is quoted; a number that refuses to print
  is investigated. `check:name-vocabulary` already works this way against the
  probe artifact — follow it.
- Re-running is 113 clones and is **not** a cron job. It stays manual, with the
  reason recorded, exactly as the freshness gate already baselines it.
- No number from this artifact may be quoted anywhere — `AI_SDLC.md`, an
  article, a benchmark receipt — while the hash does not match. Sabotage-verify
  by editing the config and confirming every consumer goes red.

## Done when

- `real-world-rule-inventory.json` records `configHash` and `reposHash`.
- Every consumer of the artifact refuses to report on a mismatch, verified by
  sabotage.
- The scan is re-run against the current config, and the new inventory is
  committed with both hashes.
- The corrected "rules that never fire" figure replaces the current one, and the
  react-a11y block is stated separately — because comparing it to the old number
  is the evidence that the instrument was the problem.
