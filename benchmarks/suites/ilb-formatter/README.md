# `ilb-formatter` — Interlace Whole-Run Formatter Bench

> Stress-test for `@interlace/eslint-formatter` (the package ESLint calls
> with `-f @interlace/eslint-formatter`) against ESLint's built-in
> formatters across five corpus shapes and five scales.
> Methodology: [`methodology.md`](./methodology.md) (v1.0).

## What it answers

> *Across the corpus shapes and scales an ESLint user actually sees in
> CI and PR review — does our formatter cost fewer tokens than ESLint's
> default `stylish`, and does the structured JSON output preserve every
> FP/FN-attribution signal a downstream LLM or dashboard depends on?*

This is a property of the **whole-run formatter** (`LintResult[]` in,
string out), not of any individual rule message. For per-finding
messages emitted by rule code, see
[`ilb-llm-tokens`](../ilb-llm-tokens/) and
[`ilb-llm-fix`](../ilb-llm-fix/).

## Run it

The runner reads the compiled formatter from
`dist/out-tsc/packages/eslint-formatter/src/index.js`, so build first
(or just `npx tsc -p packages/eslint-formatter/tsconfig.lib.json`).

```bash
# From the eslint repo root:
npm run ilb:formatter

# Or directly:
npx tsx benchmarks/suites/ilb-formatter/runner.ts

# Subset the run (fast iteration):
ILB_SHAPES=mono-rule-storm,diverse-rules \
  ILB_SCALES=tiny,small \
  ILB_FORMATS=interlace-compact,eslint-stylish \
  npx tsx benchmarks/suites/ilb-formatter/runner.ts
```

Outputs ILB-schema JSON to:

- `benchmarks/results/ilb-formatter/<date>-<label>.json`
- `benchmarks/results/ilb-formatter/latest.json`

The runner exits non-zero if any structured format
(`interlace-json`, `eslint-json`, `eslint-json-with-metadata`) fails
the signal-preservation contract on any fixture — that's the CI gate.

## Score

Two headline numbers (per the methodology):

- **Cost** — mean delta vs `eslint-stylish` (negative is cheaper).
  Reported per format. The aggregate one-number score for
  `interlace-compact` should be ≤ 0 % at every scale.
- **Signal preservation** — mean score 0..4 across fixtures. Structured
  formats must score 4.0 (every of `ruleId` / `severity` / `count` /
  `fixable` recoverable from the output).

A run also reports per-shape and per-scale breakdowns plus a
`groupCollapse` score (how aggressively the formatter dedupes repeated
rule firings — relevant for the `mono-rule-storm` shape).

## Files

| File | Purpose |
| --- | --- |
| [`methodology.md`](./methodology.md) | Versioned methodology — corpus shapes / scales / scoring / signal-preservation contract |
| [`fixtures.ts`](./fixtures.ts) | Deterministic seeded LintResult[] generator (5 shapes × 5 scales) |
| [`runner.ts`](./runner.ts) | Renders every cell, tokenizes, probes signal preservation, writes ILB JSON |

## How this aligns with the FP/FN philosophy

The repo [`README`](../../README.md) is explicit: *per-rule attribution
is mandatory; no "we have N FPs" without a rule + fixture + line*.
A formatter that drops `ruleId`, severity, fixable, or count silently
breaks that contract for every consumer downstream of the lint run —
LLM-fix prompts, dashboards, the regression gate, the audit doc.

This bench treats those four axes as a **hard contract** on structured
formats and a **scored property** on prose formats. It's the formatter
analogue of `ilb:validate-fixtures:strict` — fail loudly rather than
degrade silently.
