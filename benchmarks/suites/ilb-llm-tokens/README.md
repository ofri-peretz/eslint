# `ilb-llm-tokens` — Interlace LLM Tokens

> Token-cost benchmark for V1 vs V2 formatter output in
> [`@interlace/eslint-devkit`](../../../packages/eslint-devkit/).
> Methodology: [`methodology.md`](./methodology.md) (v1.0).

## What it answers

> *How many tokens does each formatter mode (`v1`, `v2-human`, `v2-compact`,
> `v2-agent`) consume on a representative lint-finding corpus, and how does
> that compare to V1 baseline?*

This is a property of the formatters — it does not call an LLM and does not
measure fix accuracy. For accuracy, see [`ilb-llm-fix`](../ilb-llm-fix/).

## Run it

```bash
# From the eslint repo root:
npm run ilb:llm:tokens

# Or directly:
npx tsx benchmarks/suites/ilb-llm-tokens/runner.ts
```

The runner needs `eslint-devkit` to be built first (`npx tsc` at the repo
root or in the package). Outputs JSON to:

- `benchmarks/results/ilb-llm-tokens/<date>-<label>.json` (timestamped)
- `benchmarks/results/ilb-llm-tokens/latest.json` (stable doc target)

## Score

**Single number**: mean delta vs V1 across all fixtures, in percent
(`o200k_base` tokenizer, headline). Negative is better.

Reported per non-V1 format. Scorecard surfaces `v2-compact` since that's
the mode designed to compete with V1 on cost.

## Files

| File | Purpose |
| --- | --- |
| [`methodology.md`](./methodology.md) | Versioned methodology — corpus / scoring / tokenizer |
| [`fixtures.json`](./fixtures.json) | 12 fixtures across security / quality / performance |
| [`runner.ts`](./runner.ts) | Renders every (fixture, format), tokenizes, writes ILB JSON |
