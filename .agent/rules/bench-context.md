# Bench Context — Agent Onboarding Prelude

> **Purpose.** Single-read prelude for any agent working on the bench / leadership initiative. Replaces ~1,000 lines of scattered docs with one ~250-line digest. **Read this first**, then drill into the cited file/section only when you need detail.
>
> **Scope.** Everything an agent needs to know about: bench philosophy, vocabulary contract, the 10 benches, the 10 flagship rules, the severity policy, the 4-phase leadership roadmap, and where each operational answer lives.
>
> **Last synced:** 2026-05-09. If a bench, principle, or roadmap item changed since, the master docs win — see "Source-of-truth links" at the bottom.

---

## 1. Vision (one sentence)

Be the static-code-analysis layer that **both humans and AI agents** reach for first when they need to lint, audit, or remediate JavaScript / TypeScript — by mastering measurement, credibility, and agent-friendliness.

## 2. The 10 principles (one line each)

Full text in [`benchmarks/README.md` §1](../../benchmarks/README.md#1-philosophy--how-we-value-fp--fn--tp--tn). One-line digest:

1. **Recall first, precision second** — a missed CWE > a noisy rule. Today: 100% recall on Arena + Juliet, guard it.
2. **Two axes of truth** — synthetic (Arena, Juliet) proves labels; real OSS (Wild, Edge) proves production fidelity. Both must be green.
3. **Adversarial framing is explicit** — FP-edge repos are *expected* to over-fire; marked `fpEdge: true` in the registry.
4. **Per-rule attribution mandatory** — no aggregate without rule + fixture + line drilldown. Tooling enforces this.
5. **Multi-rater agreement beats single-author labels** — Cohen's κ vs sonarjs / microsoft-sdl is a trust signal.
6. **Trust through reproducibility** — every claim has a JSON receipt and a `jq` query that recomputes it.
7. **Drift is a bug** — stale benches fail CI, not "scheduling."
8. **FPs are weighted by bench severity** — Arena ×10, Juliet ×5, Quality ×3, Wild ×1, Edge ×0.1.
9. **Consistency over time builds credibility** — frozen corpus per version, deterministic input, append-only history in `benchmark-results/history.ndjson`. Every result publishes the bench *version*.
10. **Severity is a contract, not a label** — `error` requires precision ≥ 95% on Wild + Arena; `warn` requires ≥ 70%. See §4 below.

## 3. Vocabulary contract — Cost · Effectiveness · Latency

Every result JSON, scorecard cell, and CI gate uses **exactly these field names**. No synonyms; if a bench doesn't measure an aspect, mark it explicit `n/a` rather than substituting a label.

| Aspect | Standard fields | What it answers |
|---|---|---|
| **Cost (tokens)** | `tokensO200k` (headline) · `tokensCl100k` (sanity) · `meanTokensO200k` | Will an LLM consumer choke on this? Is per-PR feedback cheap? |
| **Effectiveness (context)** | `effectiveness` (umbrella) — concrete: `f1` · `precision` · `recall` · `signalScore` (0–4) · `passRate` · `vulnDetectionRate` | Did the rule classify TP/FP correctly? Did the LLM ship a working fix? |
| **Latency (speed)** | `latencyMsP50` · `latencyMsP95` · `meanLatencyMs` · `msPerFile` · `peakRssMb` | Pre-commit-hook eligible? CI-budget compatible? |

**Why all three:** a formatter cheap on tokens but losing signal is useless; a rule accurate but slow blocks adoption; a fast accurate rule with noisy output trains devs to ignore CI.

## 3b. Toolchain pins — every result must declare them

Bench results capture **rule output and timing**, both of which depend on the toolchain. Every result JSON must include a `toolchain` block so a number is interpretable years later and so the **tsc-go** (TypeScript 6) transition is observable in the data.

Required fields:

```json
"toolchain": {
  "node": "20.18.1",
  "eslint": "9.18.0",
  "typescript": "5.6.3",
  "tsCompiler": "tsc-classic",   // "tsc-classic" (5.x and earlier) | "tsc-go" (6.x, Project Corsa)
  "typescriptEslint": "8.19.1",
  "platform": "darwin-arm64"
}
```

**Why pin the TS compiler explicitly:** TypeScript 6 ships a Go-rewritten compiler (tsc-go / Project Corsa) targeting ~10× type-check speedup. Type-aware rules (`detect-object-injection` boost, `pg/no-unsafe-query`, etc.) may produce different findings or different timings under tsc-go vs tsc-classic. Without an explicit `tsCompiler` field, those deltas look like rule regressions instead of compiler transitions.

**Matrix dimension (planned):** ILB-Perf and accuracy benches will run against `{tsc-classic@5.x, tsc-go@6.x}` × `{eslint@8, @9, @10}` once tsc-go reaches GA. Until then, runs default to whatever `typescript` resolves in `node_modules` and the field is recorded for traceability. See roadmap item 1.14.

## 4. The 10 benches

Each is single-dimension, versioned, with a frozen corpus.

| # | Bench | Question | Cost | Effectiveness SLO | Latency SLO |
|---|---|---|---|---|---|
| 1 | **ILB-Arena** | Vs every ESLint security plugin, who wins? | n/a | F1 ≥ 95%, rank ≤ 3 | from ILB-Perf |
| 2 | **ILB-Arena-Quality** | Same, for quality plugins | n/a | F1 ≥ 75% | from ILB-Perf |
| 3 | **ILB-Juliet** | On synthetic CWE corpus, do we detect what we should? | n/a | F1 ≥ 80%, BAS ≥ 60% | from ILB-Perf |
| 4 | **ILB-Wild** | What do we find on real popular OSS (1.8M LoC, 22 repos)? | n/a | ≤ 1/kLoC on non-edge repos | piggy-backs Perf |
| 5 | **ILB-Edge** | On adversarial-real code (three.js eval), how noisy? | n/a | FP rate ≤ 2% | piggy-backs Perf |
| 6 | **ILB-Cov** | What fraction of our rules fires on real code? | n/a | ≥ 70% | derived |
| 7 | **ILB-Perf** | Are we fast enough? | n/a | n/a | ≤ 15 ms/file |
| 8 | **ILB-AI** | Do our rules catch what LLMs ship? | API spend tracked | `vulnDetectionRate` w/ Wilson CI | quarterly batch |
| 9 | **ILB-LLM-Tokens** | Are per-finding messages cheap to feed to LLMs? | ≤ V1 (security/v2-compact) | n/a | n/a |
| 9b | **ILB-LLM-Fix** | Can the LLM act on diagnostics? | informational | passRate ≥ 80% | round-trip per call |
| 10 | **ILB-Formatter** | Whole-run formatter cost vs ESLint stylish + signal preservation | `interlace-compact` ≤ 0% vs stylish | structured formats = 4.0/4 | ≤ 50 ms (large), ≤ 250 ms (extreme) |

Cadence: per-PR (Arena, Juliet, Quality, Formatter) · nightly (Wild + Edge + Cov + Perf) · weekly (Coverage, LLM-Tokens, LLM-Fix) · quarterly (AI, CWE expansion review) · annually (re-baseline FP weights).

## 5. Severity classification policy (the contract)

A rule's severity is defined by its real-world consequence + FP risk:

- **`error`** — code is broken or exploitable as written; reviewer expected to **block PR**. Requires **precision ≥ 95%** on Wild + Arena. Examples: hardcoded prod credential · `eval(userInput)` · SQL string concat · prototype-pollution sink.
- **`warn`** — likely problematic in some contexts; reviewer should look but may legitimately keep. Requires **precision ≥ 70%** on Wild. Default for security rules where context determines impact.
- **`info`** — reserved, not currently used.
- **`off`** — experimental / deprecated / niche; available but not in `recommended`.

**Promotion gate (enforced):** a rule cannot ship as `error` until it has ≥ 4 fixtures across Arena + Juliet AND ≥ 90 days of Wild data showing precision threshold met. New rules ship `warn`. Demotion is mandatory if Wild precision drops below threshold for two consecutive nightly runs.

## 6. The 10 flagship rules

These get dedicated independent benchmarks, oxlint compatibility guarantees, and per-rule precision/recall SLOs. Full criteria + table in [`.agent/flagship-rules.md`](../flagship-rules.md).

| # | Rule | Plugin | Strategic role |
|---|---|---|---|
| 1 | `no-cycle` | `import-next` | Head-to-head vs `eslint-plugin-import` (38.2M dl/wk) |
| 2 | `no-unsafe-query` | `pg` | Green-field — driver-aware SQL-i |
| 3 | `no-hardcoded-credentials` | `secure-coding` | Universal baseline; CVSS-tagged |
| 4 | `detect-object-injection` | `secure-coding` | Direct upgrade vs legacy `eslint-plugin-security` |
| 5 | `no-unsafe-query` | `mongodb-security` | Green-field — Mongoose/MongoDB injection |
| 6 | `no-algorithm-none` | `jwt` | Green-field — JWT vertical anchor |
| 7 | `no-innerhtml` | `browser-security` | Head-to-head vs `eslint-plugin-no-unsanitized` |
| 8 | `hooks-exhaustive-deps` | `react-features` | Head-to-head vs `eslint-plugin-react-hooks` |
| 9 | `alt-text` | `react-a11y` | Head-to-head vs `jsx-a11y/alt-text` |
| 10 | `no-unsafe-output-handling` | `vercel-ai-security` | Green-field — anchors AI-security |

## 7. Plugin-to-OSS-baseline mapping (45K+ stars policy)

Full inverse pivot in [`benchmarks/BASELINE_MATRIX.md`](../../benchmarks/BASELINE_MATRIX.md). The two-tier policy:

- **Tier 1 (Consensus, ≥ 45K⭐)** — default, no questions asked.
- **Tier 2 (Niche Flagship, < 45K⭐)** — only allowed as named exception in niches with no T1 option (lambda, AI SDK, MongoDB-TS, NestJS extras, PG ORM extras, Express middleware).

**Top-3 baselines per plugin (real-signal):**

| Plugin | Top 3 |
|---|---|
| secure-coding | next.js · shadcn-ui · supabase |
| browser-security | next.js · shadcn-ui · supabase |
| node-security | next.js · supabase · strapi |
| express-security | strapi · cal.com · payload |
| lambda-security | serverless · sst · aws-lambda-powertools |
| nestjs-security | nestjs · twentyhq · nestjs-typeorm |
| vercel-ai-security | vercel-ai · langchain-js |
| pg | supabase · twentyhq · medusa |
| mongodb-security | payload (T2-only) |
| crypto | appwrite |
| jwt | supabase |

**FP-edge corpus** (ILB-Edge): three.js · react · webpack · lodash · babel.

## 8. Leadership roadmap — current phase + status

Full plan in [`benchmarks/LEADERSHIP_ROADMAP.md`](../../benchmarks/LEADERSHIP_ROADMAP.md). Live status in [`benchmarks/state.json`](../../benchmarks/state.json) (machine-readable). Use `state.json` for "what's shipped / what's next" queries — never re-parse the markdown for that.

| Phase | Window | Theme | Items |
|---|---|---|---|
| 1 | Q3 2026 (May–Jul) | Foundation | SARIF · severity-weighted F1 · bootstrap CI · pre-registration · ILB-Determinism · ILB-Autofix · MITRE CWE submission · differential bench scaffolding · severity audit · vocabulary enforcement · history.ndjson · promotion gate |
| 2 | Q4 2026 (Aug–Oct) | Credibility & Agent-Axis | SSDF/ASVS/CAPEC mappings · ILB-Confidence · ILB-Discover · ILB-Evade · MCP server PoC · ILB-Provenance |
| 3 | Q1 2027 (Nov–Jan) | Own the Category | Public ILB leaderboard · differential publication · OWASP engagement · MCP across all plugins |
| 4 | Q2 2027 (Feb–Apr) | Academic Moat | Mutation testing · ISO 25010 · external replication · Cohen's κ · open corpus governance · ASE/ICSE paper |

## 9. Where to look — task → file map

| Task | Read |
|---|---|
| What's the philosophy? | This doc §2 → drill `benchmarks/README.md` §1 |
| What does ILB-X measure? | This doc §4 → drill `benchmarks/README.md` §4 (per-bench detail) |
| Vocabulary for result JSON | This doc §3 → drill `benchmarks/README.md` §1 "Three measurement aspects" |
| What's our latest F1 / coverage / etc.? | `benchmark-results/scorecard.md` (regenerated) — never paste numbers in code docs |
| What baseline does plugin X use? | This doc §7 → drill `benchmarks/BASELINE_MATRIX.md` |
| Add a baseline repo | `benchmarks/BASELINE_MATRIX.md` "Update procedure" + edit `scripts/ilb-wild.mjs` |
| What's shipped on the roadmap? | `benchmarks/state.json` (machine-readable) — fall back to `LEADERSHIP_ROADMAP.md` §3 tracker |
| Add a roadmap item | `benchmarks/LEADERSHIP_ROADMAP.md` §5 "Update procedure" — also update `state.json` |
| Which rules are flagship? | This doc §6 → drill `.agent/flagship-rules.md` |
| Severity rules / promotion gate | This doc §5 → drill `benchmarks/README.md` §1 "Severity classification policy" |
| jq drill recipes | `benchmarks/README.md` §6 |
| Open FP/FN remediation work | `benchmarks/FP_FN_REMEDIATION_TRACKER.md` |
| Refresh procedure for results | `benchmarks/README.md` §5 "Cadence" |

## 10. Operating principles for agents working on this initiative

1. **Read this prelude first**, drill into specifics only as needed. Avoid loading 1,000+ lines of context for queries answered here in 250.
2. **Query `state.json`, not markdown**, for "what shipped / what's next." Markdown trackers exist for humans; JSON is the source of truth for agents.
3. **When extending the roadmap or principles, update both** the master doc *and* this prelude. Drift between them defeats the prelude's purpose.
4. **Do not paste numbers into static docs** — they go stale. Numbers live in `benchmark-results/` and `state.json`.
5. **Respect the vocabulary contract** — if you emit a result file, use the standard field names. Don't invent synonyms.
6. **Bench-version every result** — every JSON in `results/` carries a `benchVersion` field per principle #9.
7. **For agent-autonomous work:** local items (code, tests, docs) are fine. **Do not** auto-execute items touching public bench publication, MITRE / OWASP / NIST submissions, or external replication arrangements — those need human approval per the roadmap's Owner clause.

---

## Source-of-truth links

- [`benchmarks/README.md`](../../benchmarks/README.md) — philosophy, 10 benches, severity policy, vocabulary contract, jq recipes
- [`benchmarks/BASELINE_MATRIX.md`](../../benchmarks/BASELINE_MATRIX.md) — plugin → OSS-repo map, 45K+ policy
- [`benchmarks/LEADERSHIP_ROADMAP.md`](../../benchmarks/LEADERSHIP_ROADMAP.md) — 4-phase plan, 25+ items
- [`benchmarks/FP_FN_REMEDIATION_TRACKER.md`](../../benchmarks/FP_FN_REMEDIATION_TRACKER.md) — active FP/FN agenda
- [`benchmarks/state.json`](../../benchmarks/state.json) — machine-readable status snapshot
- [`.agent/flagship-rules.md`](../flagship-rules.md) — the 10 flagship rules + selection criteria
- [`scripts/ilb-wild.mjs`](../../scripts/ilb-wild.ts) — the BENCHMARK_REPOS registry (lines 87–329)
- [`benchmark-results/scorecard.md`](../../benchmark-results/scorecard.md) — live numbers (regenerated by `npm run ilb:scorecard`)

If a fact in this prelude conflicts with a master doc, the master doc wins. **Open a PR amending this prelude in the same change.**
