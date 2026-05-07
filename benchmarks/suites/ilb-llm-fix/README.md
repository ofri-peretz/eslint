# `ilb-llm-fix` — Interlace LLM Fix Accuracy

> First-fix accuracy benchmark for V1 vs V2 formatter output.
> Methodology: [`methodology.md`](./methodology.md) (v1.0).

## What it answers

> *Does V2's added context (`why`, before/after examples, structured agent
> JSON) actually help an LLM produce a correct first-attempt fix more often
> than V1?*

Token-cost is measured separately by [`ilb-llm-tokens`](../ilb-llm-tokens/).
This bench measures whether spending more tokens on richer context buys
more correct fixes.

## Run it

> ⚠️ Run from a regular shell. The `claude` CLI guards against nested
> invocation and will short-circuit with "Prompt is too long" if started
> from inside another Claude Code session.

```bash
# Default: 5 fixtures × 3 variants × 1 model (haiku) ≈ ~$0.05
npm run ilb:llm:fix

# Or directly:
npx tsx benchmarks/suites/ilb-llm-fix/runner.ts

# Cheaper (skip v2-agent):
ILB_VARIANTS=v1,v2-human npx tsx benchmarks/suites/ilb-llm-fix/runner.ts

# Stronger model:
ILB_MODELS=sonnet npx tsx benchmarks/suites/ilb-llm-fix/runner.ts

# Multi-model run:
ILB_MODELS=haiku,sonnet ILB_VERBOSE=1 npx tsx benchmarks/suites/ilb-llm-fix/runner.ts
```

Outputs ILB-schema JSON to:

- `benchmarks/results/ilb-llm-fix/<date>-<variants>-<models>.json`
- `benchmarks/results/ilb-llm-fix/latest.json`

## Score

**Single number**: macro-averaged pass rate across all (variant, model)
cells. The result also includes per-variant pass rates so V1↔V2 deltas
are obvious without re-aggregating from the raw results array.

## Cost reference (May 2026)

| Model | ~Cost per default run (5 fixtures × 3 variants) |
|---|---|
| `haiku` | ~$0.05 |
| `sonnet` | ~$0.30 |
| `opus` | ~$0.80 |

The runner reports actual `total_cost_usd` per call from the CLI; the
summary sums it.

## Files

| File | Purpose |
| --- | --- |
| [`methodology.md`](./methodology.md) | Versioned methodology — corpus / scoring / verifier shape |
| [`fixtures.json`](./fixtures.json) | 5 fixtures with buggy code + verifier |
| [`models.json`](./models.json) | Models tested (haiku/sonnet/opus by default) |
| [`runner.ts`](./runner.ts) | Renders prompts, calls `claude` CLI, verifies, writes ILB JSON |
