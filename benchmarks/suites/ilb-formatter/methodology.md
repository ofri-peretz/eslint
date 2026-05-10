# `ilb-formatter` — Methodology

> Stress-test benchmark for `@interlace/eslint-formatter` (whole-run output) vs
> ESLint built-in formatters (`stylish`, `json`, `json-with-metadata`, `html`).
> Schema: [agents/interlace/evidence-framework.md](https://github.com/ofri-peretz/agents/blob/main/interlace/evidence-framework.md).

**Status:** v1.1 — adopted 2026-05-09 (bumped from v1.0 same day to add `rare-error-amid-noise` shape + `interlace-ndjson` format. Cost / Effectiveness / Latency contracts unchanged. Prior v1.0 results remain comparable on all pre-v1.1 cells; new cells have no v1.0 baseline by definition.)

> **Why a separate suite?** [`ilb-llm-tokens`](../ilb-llm-tokens/) measures
> per-finding messages emitted by `@interlace/eslint-devkit` rule code (V1 vs
> V2 messaging). This suite measures the **whole-run formatter** that ESLint
> calls with `-f @interlace/eslint-formatter` — a different surface that ships
> as its own package and competes with ESLint's built-in formatters on every
> CI run.

---

## What this measures

For each (corpus shape, scale) fixture in [`fixtures.ts`](./fixtures.ts), the
runner reports the project-wide **Cost / Effectiveness / Latency** triad
(see [`benchmarks/README.md` §1, "The three measurement aspects"](../../README.md))
for every formatter under test:

1. **Cost (tokens).** Renders the `LintResult[]` payload through every
   formatter, tokenizes with `gpt-tokenizer` (`o200k_base` headline,
   `cl100k_base` sanity), reports `meanTokensO200k` plus delta vs the
   baseline (`eslint-stylish`).
2. **Effectiveness (context).** Probes the output for **signal
   preservation** — whether the four FP/FN-relevant axes (`ruleId`,
   `severity`, `count`, `fixable`) survive the render in machine-recoverable
   form (`signalScore` ∈ [0, 4] per fixture). Also computes
   **group-collapse ratio** — how aggressively the formatter dedupes
   repeated rule firings across files (the whole point of our
   `groupByRule` is to amortise repetition).
3. **Latency (speed).** Measures wall-clock per-render time with
   `process.hrtime.bigint()`, **median-of-5** samples after one warm-up
   render to defeat first-call JIT cost. Reports `latencyMsP50`,
   `latencyMsP95`, `latencyMsMin`, `latencyMsMax` per cell, and
   `meanLatencyMs` / `worstLatencyMsP95` per format.

This is a property of the formatters. It does not call an LLM. For LLM-fix
accuracy on per-finding messages, see
[`ilb-llm-fix`](../ilb-llm-fix/).

---

## Headline numbers (one per triad axis)

We report **three** headline numbers — one per aspect of the triad — so
you cannot game one at the cost of another.

### Cost headline

```text
costScore = mean across (shape, scale) of:
              tokens(format) / tokens(eslint-stylish) − 1
            expressed as a percentage
```

`stylish` is the baseline because it is ESLint's default formatter and
the de-facto industry standard for whole-run output. Negative is better
(saved tokens vs the default). The scorecard surfaces
**`interlace-compact` cost score**.

### Effectiveness headline

`signalScore` ∈ {0,1,2,3,4} per fixture (one point per axis recoverable).
The scorecard surfaces **mean `signalScore` per format** and the
structured-format contract (must equal 4.0 on every fixture).

### Latency headline

`latencyMsP50` per cell, then per-format median P50 across all fixtures
and worst-case P95 (small-N, so worst observation). The scorecard
surfaces **`interlace-compact` median P50** plus the per-scale ceilings
in `latencyContract.perScaleCeilingMs`.

The runner reports per-format, per-shape, and per-scale breakdowns so a
single noisy fixture cannot hide the headline. Per-scale latency
breakdown is the right cut for spotting algorithmic regressions:
linear growth ≈ healthy; super-linear at `large`/`extreme` ≈ a bug.

---

## Formats measured

| Format | Source | Industry parallel |
| --- | --- | --- |
| `interlace-human` | `@interlace/eslint-formatter` mode `human` | rich terminal — competes with `stylish` |
| `interlace-compact` | `@interlace/eslint-formatter` mode `compact` | token-lean prose — competes with `stylish` for AI consumers |
| `interlace-json` | `@interlace/eslint-formatter` mode `json` | structured — competes with `json` / `json-with-metadata`. Note v1.1: `summary` ships before `rules` so prompt-cache prefixes stay valid when the rule list churns ([Anthropic prompt-caching guide](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)). |
| `interlace-ndjson` *(v1.1)* | `@interlace/eslint-formatter` mode `ndjson` | newline-delimited JSON for streaming agent loops; first line is the summary, then one JSON object per rule. Validated industry pattern: [`rtk-ai`](https://github.com/NotMyself/rtk-ai) reports ~90 % token reduction on lint output via NDJSON. |
| `eslint-stylish` | ESLint built-in (baseline) | the default everyone sees |
| `eslint-json` | ESLint built-in | machine-readable, no rules-meta |
| `eslint-json-with-metadata` | ESLint built-in | machine-readable + rules meta (largest) |
| `eslint-html` | ESLint built-in | dashboards / CI artifacts (largest by far) |

Built-ins removed from ESLint v9 core (`compact`, `unix`, `junit`, `tap`,
`visualstudio`, `checkstyle`, `codeframe`) are intentionally **out of
scope** for v1.0. They live in separate npm packages and don't represent
the universe a fresh `npm install eslint` user faces today.

---

## Corpus shapes (axes of stress)

Industry-standard stress framing: instead of a single corpus we vary two
orthogonal axes. Every (shape × scale) pair is rendered through every
format.

### Shapes — what the lint output looks like

| Shape | What it stresses | FP/FN relevance |
| --- | --- | --- |
| `mono-rule-storm` | One rule fires N times across N files (e.g. `no-console` on a fresh codebase). Tests **group-collapse**. | Real-world FP: a noisy rule should not flood the output and bury TPs. |
| `diverse-rules` | 20 distinct rules each firing once. Tests **rules-meta payload cost** + **deterministic ordering**. | TP shape: the diversity case where every finding is signal. |
| `mixed-severity` | 60 % errors / 40 % warnings, mixed across rules. Tests **severity preservation** in compact / structured outputs. | TP/FN distinction: error-vs-warning is the first signal a triager uses. |
| `all-fixable` | Every finding carries an autofix. Tests **fixable-flag preservation** (the `(fixable)` / `[fixable]` / `fix:true` marker). | FP-mitigation: an autofixable finding has lower triage cost — losing the flag inflates the perceived FP rate. |
| `security-heavy` | All findings are from security plugins (interlace-style ruleIds + meta with `description` + `docsUrl`). Tests **docs-URL preservation** + **rule-meta enrichment**. | TP gravity: security findings are the FN-worst-case if dropped. |
| `rare-error-amid-noise` *(v1.1)* | 1 single critical security error firing once + N noisy `no-console` warnings. Tests **severity-first ordering** — count-desc alone would render the error LAST; severity-first puts it FIRST where LLMs and humans actually look. | TP rescue: the most-attention-worthy finding must not be buried under noise. "Lost in the middle" effect — top-of-list is dramatically more visible to LLMs. |

### Scales — corpus size in `(files, total findings)`

| Scale | Files | Findings | Rationale |
| --- | --- | --- | --- |
| `tiny` | 1 | 3 | A single file's CI failure — common case in pre-commit. |
| `small` | 10 | 30 | Average PR — what most LLM-context windows see. |
| `medium` | 100 | 300 | Full-feature PR or sub-package CI run. |
| `large` | 500 | 1,500 | Monorepo-wide CI run — token budgets really matter here. |
| `extreme` | 2,000 | 6,000 | Initial onboarding scan — the case ESLint built-ins fall over on. |

Total cells: 5 shapes × 5 scales × 7 formats = **175 measurements per run**.

---

## Signal preservation — FP/FN philosophy alignment

The repository's [`README.md`](../../README.md) is explicit that we judge
rules on TP / FP / FN / TN and that **per-rule attribution is mandatory**.
A formatter that drops `ruleId`, severity, fixable, or count silently
weakens that contract — every downstream FP/FN dashboard, regression gate,
and LLM-fix prompt depends on those four axes surviving the render.

We therefore probe four axes per format on every fixture:

| Axis | Why it matters | How we probe |
| --- | --- | --- |
| `ruleId` recoverable | Required for per-rule FP/FN attribution. A formatter that hides ruleId breaks every drill in §7 of the bench README. | Format-specific recogniser: regex for prose formats, JSON path for structured. Pass = every input ruleId present in output. |
| `severity` recoverable | Error-vs-warning is the first triage cut. | Same — must distinguish the two consistently across the run. |
| `count` recoverable | A grouped formatter must report N (×N or "and M more") so the LLM/human knows true scale. Per-file formatters get count via line counting. | Per-rule total in input must be present (literally or reconstructible). |
| `fixable` flag | Triage-cost signal — fixable findings are nearly-zero-cost FPs. Losing the flag inflates perceived noise. | Fixable rules must carry a recognisable marker for at least one occurrence. |

A format scores `signalPreservation` ∈ [0,4] per fixture (one point per
axis). Aggregate is mean across fixtures. **`interlace-json` and
`eslint-json` should score 4.0 — anything less is a bug.**

This is the formatter analogue of `ilb:validate-fixtures:strict`: a
contract that fails CI rather than degrading silently.

---

## Latency contract

Wall-clock budget per render. **Per-scale ceilings** for `interlace-*`
formats — the ceiling is generous on tiny scales (where measurement
noise dominates) and tightens monotonically with corpus size. Failing
the ceiling exits the runner non-zero, the same as the signal contract.

| Scale | Files / findings | P50 ceiling | Why |
| --- | --- | ---: | :--- |
| `tiny` | 1 / 3 | 5 ms | Pre-commit hook budget — should feel instant. |
| `small` | 10 / 30 | 10 ms | Average PR — every save in watch mode. |
| `medium` | 100 / 300 | 25 ms | Full-feature PR — still well under "blocks the keyboard" threshold. |
| `large` | 500 / 1,500 | 50 ms | Monorepo-wide CI — the formatter must not dominate the run. |
| `extreme` | 2,000 / 6,000 | 250 ms | Initial onboarding scan — generous because we expect to be IO-bound here. |

ESLint built-ins are **measured** but not gated on these ceilings — they
are competition, not contract. We track their latency curves so a
regression in one of them is visible in our results before downstream
users hit it.

The samples-per-cell is `LATENCY_RUNS = 5`, with one discarded warm-up
render. Median-of-5 keeps the wall-clock cost of the bench bounded
(<10 s for the full 175-cell sweep on a modern laptop) while still
giving a stable P50.

## Group-collapse ratio

For each fixture, we compute:

```text
groupCollapse = (lines_per_file_naive − lines_actual) / lines_per_file_naive
```

where `lines_per_file_naive` is what a non-grouping formatter would emit
(one line per finding plus a header per file). This is the lever
`@interlace/eslint-formatter` pulls for the `mono-rule-storm` shape — and
the metric makes that lever auditable. `eslint-stylish` scores ≈ 0 on
this axis by construction; `interlace-compact` should approach 0.95+ on
mono-rule-storm at large scale.

---

## Provenance

Per the cross-bench provenance contract
([`benchmarks/README.md` §1, "The provenance contract"](../../README.md)),
this bench's result envelope publishes:

- `provenance.model.kind = "tokenizer-proxy"` — no LLM is called. The
  tokenizer stands in for the consumer model on the cost axis.
  (For real-LLM benches see `ilb-llm-fix` and `ilb-ai`.)
- `provenance.model.name = "o200k_base + cl100k_base (gpt-tokenizer)"`
  — the proxy surfaces being measured.
- `provenance.tools.{count, items[]}` — every tool that materially affects
  the result with version + role. Currently 5: `@interlace/eslint-formatter`
  (subject), `eslint` (comparator + baseline), `gpt-tokenizer` (cost
  measurement), `node:process.hrtime.bigint` (latency measurement),
  `tsx` (TS runtime).
- `provenance.subjectsUnderTest` — the `interlace-*` formats being judged.
- `provenance.comparators` — the `eslint-*` formats they're judged
  against, with `provenance.baselineFormat = "eslint-stylish"` calling out
  the cost-axis baseline explicitly.

The runner asserts `tools.count === tools.items.length` before writing
the result file. A drift between count and list is a stale-result smell
and aborts the run.

## Tokenizer

[`gpt-tokenizer`](https://www.npmjs.com/package/gpt-tokenizer) on two
encodings (matching `ilb-llm-tokens` for cross-bench comparability):

- `o200k_base` — GPT-4o, o1, behaves close to Claude 3.5+ on mixed
  natural-language + code. **Headline.**
- `cl100k_base` — legacy GPT-3.5 / GPT-4. Sanity check. The two should
  agree within ~10 %; a divergence indicates a tokenizer-specific
  pathology in the format and is logged but does not score.

---

## Versioning rules

Bumping the methodology version (`v1.0` → `v1.1`) is required when:

- The set of corpus shapes or scales changes.
- The signal-preservation axis set changes.
- The score formula changes.
- The baseline format changes (e.g. moving off `eslint-stylish`).
- The **latency SLO ceilings** change.
- The **`LATENCY_RUNS`** sample count changes (it affects how P50/P95 are
  defined for small-N).

Adding a new formatter under test does **not** bump the version — it is a
new column in the result, not a methodology change. Same rule as
`ilb-llm-tokens`.

---

## Per-run protocol

1. Build `@interlace/eslint-formatter` (the runner reads its compiled
   `dist/out-tsc/packages/eslint-formatter/src/index.js`).
2. Generate fixtures programmatically from
   [`fixtures.ts`](./fixtures.ts) — deterministic, seeded, no I/O.
3. For each (shape × scale × format) cell, render once (deterministic),
   tokenize, probe signal preservation, compute group-collapse.
4. Aggregate per (format) and per (shape, format).
5. Write the result JSON to
   `eslint/benchmarks/results/ilb-formatter/<date>-<label>.json` and
   update `latest.json` to the same payload.

The runner is single-threaded and deterministic. Sources of variance
across runs:

- Formatter source code changes (tracked in
  `versions.eslintFormatter`).
- ESLint version changes (tracked in `versions.eslint`).
- Tokenizer version (tracked in `versions.tokenizer`).
- Fixtures version (tracked in `versions.fixtures`).

All four are recorded in every result JSON so a regression can always be
traced to one of them.
