---
slug: the-reviewer-comparison-can-decide
opened: 2026-11-25
packages: []
cases: []
---

# Intent — the AI reviewer comparison is large enough to decide, and its labels are checked

> Stage 1 artifact. Follows Anthropic's
> [Building strong safety evaluations](https://www.anthropic.com/research/building-strong-safety-evaluations)
> (graders validated against humans, adequate samples, stated uncertainty), mapped in
> `AI_SDLC_PHILOSOPHY.md` gaps 1 and 2.

**Status:** draft · **Opened:** 2026-11-25 · **Owner:** @ofri-peretz

---

## What is wanted

1. **Report uncertainty.** `scripts/review-hit-rate.ts` prints a 95% Wilson interval next to
   every rate (signal share, acted on).
2. **Run until it decides, not for a fixed count.** The scheduled comparison (task
   `eslint-review-hit-rate-compare`) keeps adding merged PRs until the after-interval for signal
   share no longer overlaps the baseline's (40%, 22–61%), or 60 PRs pass. It then reports
   "improved", "worse" or "no detectable change".
3. **Check the labeller against a human.** Ofri hand-labels a fixed sample of 20 findings, mixed
   from the Claude and CodeRabbit baselines. The model labeller's agreement is reported as Cohen's
   kappa. A kappa below 0.6 means labels are not used for a decision until the label definitions
   are fixed.
4. **Compare like with like.** Each dump row records the reviewer model (for example
   `claude-sonnet-4-6`) and the prompt's git SHA, so a baseline and a comparison taken under
   different prompts or models are never mixed.

## Why now

- Baseline, 2026-11-25: Claude 8/20 findings needed a reader (40%, 95% CI 22–61%). CodeRabbit:
  12/13 (92%, 67–99%), from only 2 PRs.
- The scheduled comparison looks at 10 PRs, which cannot separate 40% from 50%. Its verdict would
  be noise presented as a result.
- Every label so far came from a Sonnet reader that no human has checked.

## Affected users and systems

`scripts/review-hit-rate.ts` and its test, `docs/review-hit-rate/`, and the scheduled task
`eslint-review-hit-rate-compare`. The per-repo reviewer split (eslint Claude; serverless and
subagent-gateway CodeRabbit) is decided by this measurement.

## Constraints

- The labeller prompt and definitions stay fixed between baseline and comparison. A change to
  them restarts the baseline.
- Human labelling is capped at 20 findings, about 15 minutes, done once.
- No reviewer is removed or added on the strength of an interval that overlaps.

## Success criteria

- `review-hit-rate` output shows `40% (22–61%)`. A test checks the interval against a known value
  (8/20 → 22–61%).
- The comparison report states a verdict and both intervals. A test feeds overlapping and
  separated pairs and asserts "no detectable change" and "improved".
- `docs/review-hit-rate/README.md` records the kappa from the 20 hand labels and which labels
  disagreed.
- Every new dump row has `model` and `promptSha`, and the comparison refuses to mix rows whose
  model or prompt differs, naming the mismatch.
