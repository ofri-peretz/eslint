# `ilb-llm-tokens` — Methodology

> Token-cost benchmark for V1 vs V2 formatter output in `@interlace/eslint-devkit`.
> Schema: [agents/interlace/evidence-framework.md](https://github.com/ofri-peretz/agents/blob/main/interlace/evidence-framework.md).

**Status:** v1.0 — adopted 2026-05-03

> **Headline framing (added 2026-05-03):** the SLO-targetable score is
> **security/v2-compact ≤ V1**. Quality + performance fixtures intentionally
> carry V2-only context (`why`, examples, `impact`) that V1 lacks, so cost
> comparisons in those categories are apples-to-oranges and should be
> reported but not gated on. The runner now emits both `headlineScore`
> (aggregate, directional) and `perCategoryScore` (SLO-targetable). The
> scorecard surfaces the per-category security cell as the headline.

## What this measures

For each fixture in [`fixtures.json`](./fixtures.json), render the same lint
finding through every supported formatter shape and tokenize the output
deterministically. Reports per-fixture token counts and aggregate deltas
vs the V1 baseline.

This is a **property of the formatter**, not the rules. It does not call
an LLM and does not measure fix accuracy — for that, see
[`ilb-llm-fix`](../ilb-llm-fix/).

## Score (single number)

```text
score = mean across (category, format) of: tokens(format) / tokens(v1) − 1
        expressed as a percentage
```

The headline score is the **mean delta vs V1 across all fixtures, in
percent**. Negative is better (V2 saved tokens vs V1). Reported per
formatter mode (`v2-human`, `v2-compact`, `v2-agent`).

Scorecard surfaces `v2-compact` as the headline since that's the mode
intended to compete with V1 on cost.

## Formats measured

| Format | Source |
| --- | --- |
| `v1` | `formatLLMMessage` (legacy) |
| `v2-human` | `formatSecurityMessage` / `formatCodeQualityMessage` / `formatPerformanceMessage` with `mode: 'human'` |
| `v2-compact` | same, `mode: 'compact'` |
| `v2-agent` | same, `mode: 'agent'` (JSON output) |

## Tokenizer

[`gpt-tokenizer`](https://www.npmjs.com/package/gpt-tokenizer) on two
encodings:

- `o200k_base` — GPT-4o, o1, behaves close to Claude 3.5+ on mixed
  natural-language + code. The headline score uses this.
- `cl100k_base` — legacy GPT-3.5 / GPT-4. Reported but not used for
  scoring; included as a sanity check (the two should agree within ~10%).

## Fixture corpus

[`fixtures.json`](./fixtures.json) — 12 fixtures across three categories
(security, code quality, performance). Each fixture pairs a V1 input
shape with the equivalent V2 input shape so V1↔V2 comparisons are
apples-to-apples on the same lint finding.

The V2 shape intentionally carries fields V1 lacks (`why`, `vulnerable`,
`safe`, `impact`, `cycle`). That's a real difference in what the
formatter delivers to the LLM, not a measurement artifact. The score
captures the cost of that extra payload.

## Versioning rules

Bumping the methodology version (`v1.0` → `v1.1`) is required when:

- The fixture corpus changes (fixtures added, removed, modified).
- The tokenizer encoding used for scoring changes.
- The score formula changes.

Adding a new formatter mode does NOT bump the version — it's a new
column in the result, not a methodology change.

## Per-run protocol

1. Load `fixtures.json`.
2. For each (fixture, format) cell, render the formatter output once
   (deterministic — no warmup needed).
3. Tokenize with both encodings.
4. Aggregate per (category, format).
5. Write the result JSON to
   `eslint/benchmarks/results/ilb-llm-tokens/<date>-formatters-v1.3.3.json`
   and update `latest.json` to the same payload.

The runner is single-threaded and deterministic. The only sources of
variance across runs are:

- Formatter source code changes
- Fixture changes
- Tokenizer version

All three are tracked in the result JSON's `versions` field.
