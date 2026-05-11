# `ilb-llm-fix` — Methodology

> First-fix accuracy benchmark for V1 vs V2 formatter output.
> Schema: [agents/interlace/evidence-framework.md](https://github.com/ofri-peretz/agents/blob/main/interlace/evidence-framework.md).

**Status:** v1.3 — adopted 2026-05-03

> **v1.3 changes:**
>
> - 4 new OSS-derived fixtures: `hardcoded-jwt-secret` (nestjs/sample/19-auth-jwt/src/auth/constants.ts), `eval-on-dynamic-import` (payload/packages/payload/src/utilities/dynamicImport.ts), `foreach-async-floating-promise` (strapi tests + generic), `insecure-random-api-key` (cal.com/apps/web/components/apps/make/Setup.tsx).
> - Corpus grew from 8 → 12 fixtures. Now spans 6 distinct oos/ repos: nestjs, three.js, shadcn-ui, medusa, cal.com, payload (plus generic patterns from strapi/twentyhq).
>
> **v1.2 baseline:** Added `any-of` verifier shape — pass if ANY listed sub-verifier passes. Fixtures with multiple legitimate fix paths (e.g. `weak-md5-content-hash`) use this shape rather than rejecting valid alternatives.
>
> **v1.1 baseline:** every fixture must carry a `source` block citing the
> `~/repos/ofriperetz.dev/oos/` repository the pattern was extracted or
> adapted from. See [`corpus.md`](./corpus.md) for the full citation table.
> Synthetic fixtures (no OSS provenance) are no longer accepted into the
> corpus — see "Versioning rules" below.

## What this measures

For each fixture in [`fixtures.json`](./fixtures.json):

1. Render the lint finding three ways: V1, V2-human, V2-agent.
2. Send `(formatter output) + (buggy code)` to each model in
   [`models.json`](./models.json).
3. Extract the model's patched code from the response.
4. Verify the patch with the fixture's declared verifier (regex match /
   regex non-match / both).

This isolates the **formatter's impact on first-fix rate**, holding the
model and the fixture constant. It does NOT measure:

- Multi-turn fix loops (real agents retry on lint re-trigger)
- Fix safety beyond what the rule catches
- Model latency

## Score (single number)

```text
score = macro-averaged pass rate across (variant, model) cells
        = mean of (passes / total) for each (variant, model)
```

The headline score is **per (variant, model)**. The scorecard surfaces
the maximum (variant) per model for the "best-case for V2" view, and the
delta vs V1 for the "is V2 worth it?" view.

## Variants

| Variant | Source |
| --- | --- |
| `v1` | `formatLLMMessage` |
| `v2-human` | `formatSecurityMessage` / `formatCodeQualityMessage` / `formatPerformanceMessage` with `mode: 'human'` |
| `v2-agent` | same, `mode: 'agent'` (JSON output) |

`v2-compact` is omitted by design — it's the same content as `v2-human`
modulo prose density, so any fix-rate delta would be dominated by noise
at this corpus size. Re-add if a future hypothesis demands it.

## Models

Declared in [`models.json`](./models.json) — Anthropic Claude family via
the local `claude` CLI. No model selection is hardcoded in the runner;
edit `models.json` to add/remove models.

## Verifiers

Each fixture declares one of:

- `regex-must-match` — patched code must contain a substring matching the
  pattern (e.g. "the fix uses `$1` placeholder").
- `regex-must-not-match` — patched code must NOT contain a pattern (e.g.
  "the original concatenation is gone").
- `both` — both constraints hold.
- `any-of` (added v1.2) — pass if ANY listed sub-verifier passes. Use when
  a fixture has multiple legitimate fix paths and arbitrarily picking one
  would reject valid alternatives. Each option must itself be one of the
  three primitive shapes (`regex-must-match` / `regex-must-not-match` /
  `both`). Nesting `any-of` inside `any-of` is not supported.

Verifiers test the **minimum acceptable fix**, not a specific
implementation. A model is allowed to choose `$1` vs `?` placeholders, or
to refactor surrounding code, as long as the rule's hazard is gone.

## Per-run protocol

1. Load `fixtures.json` and `models.json`.
2. For each (fixture, variant, model):
   - Render the formatter output.
   - Spawn `claude -p --output-format json --strict-mcp-config
     --allowed-tools '' --disallowed-tools '*' --no-session-persistence
     --model <name>` with the prompt fed via **stdin** (NOT argv —
     `claude -p <long-arg>` hangs indefinitely on prompts longer than a
     few hundred chars).
   - Parse the JSON response, extract the fenced code block.
   - Run the fixture's verifier against the extracted code.
3. Aggregate pass rates per (variant, model).
4. Write the ILB-schema JSON to
   `eslint/benchmarks/results/ilb-llm-fix/<date>-<corpus>-<models>.json`
   and update `latest.json`.

## Cost reference (May 2026)

Default run: ~5 fixtures × 3 variants × 1 model × ~500 input + ~200 output
tokens ≈ 10K tokens. Approx per-model cost:

| Model | ~Cost per default run |
| --- | --- |
| `haiku` | ~$0.05 |
| `sonnet` | ~$0.30 |
| `opus` | ~$0.80 |

The CLI reports actual `total_cost_usd` per call; the runner sums it.

## Versioning rules

Bumping the methodology version (`v1.0` → `v1.1`) is required when:

- The fixture corpus changes (fixtures added, removed, modified).
- The verifier semantics change.
- The score formula changes.
- The system prompt or user prompt template changes.

Adding a model to `models.json` does NOT bump the version — it's a new
column in the result, not a methodology change.

### Fixture sourcing rule (v1.1)

Every fixture must carry a `source` block citing the
`~/repos/ofriperetz.dev/oos/` repository the pattern was extracted or
adapted from. The shape:

```json
{
  "source": {
    "repo": "<oos repo name>",
    "path": "<file path within the repo>",
    "url": "<canonical github URL>",
    "note": "<one-paragraph explanation of why this pattern is real and what was adapted>"
  }
}
```

Why: synthetic fixtures (no OSS provenance) make it easy to write
rules that win on contrived examples but fail on real code. Anchoring
every fixture to a concrete OSS file forces the corpus to track real
patterns the eslint plugins actually need to handle.

Two acceptable provenance shapes:

1. **Verbatim or lightly-trimmed extract.** The `path` points at the
   exact file in oos/. The `buggyCode` mirrors the snippet, possibly
   simplified to the minimum reproducer.
2. **Adapted from a real pattern.** The `path` points at a real example
   (e.g. shadcn-ui's legitimate `dangerouslySetInnerHTML` for theme
   detection), but the fixture's `buggyCode` adapts it to a hypothetical
   user-input variant. The `note` MUST disclose the adaptation.

Generic fixtures (e.g. `circular-dependency-cross-module`) are allowed
when the pattern is universally present across multiple oos/ repos —
the `source.repo` field then enumerates the repos rather than naming
one. See [`corpus.md`](./corpus.md) for the live citation table.

## What this does NOT prove

- A pass rate of 100% on this corpus does not mean V1 == V2 in production.
  The corpus is small (5 fixtures, by design), and Haiku is highly capable
  on standard CWE patterns. The eval is meaningful in two cases:
  - **Falsifying** an "X always wins" claim: even one fixture failing X is
    informative.
  - **Trend-watching**: when the corpus expands or harder fixtures land,
    the pass-rate gap should grow if V2 is genuinely helping.
- Output token counts are reported but not the score. They're an
  indirect signal — V2 may produce shorter or longer model responses;
  that's a real cost difference but doesn't speak to correctness.
