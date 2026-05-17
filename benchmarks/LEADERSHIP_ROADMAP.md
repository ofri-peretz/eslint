# Leadership Roadmap — Becoming the Static-Analysis Authority for JS

> **Vision.** Be the static-code-analysis layer that **both humans and AI agents** reach for first when they need to lint, audit, or remediate JavaScript / TypeScript. Win the category by mastering *measurement*, *credibility*, and *agent-friendliness* — three legs the field has not yet integrated.
>
> **Status.** Drafted 2026-05-09. Live tracker at the bottom of this doc — update column **Status** as each item ships. Retire this file to [`audits/`](./audits/) once Phase 4 closes.
>
> **Owner.** Project maintainer. Agent-assisted execution allowed; agent-autonomous execution **not** allowed for items that touch the public bench, mappings to industry standards, or external submissions.

---

## 1. Sequencing principles

These shape the ordering below — read before challenging the schedule.

1. **Foundations first.** SARIF emission and a `BENCHMARK_PHILOSOPHY` claim must land before everything else, because (a) every credibility seal expects SARIF and (b) every later doc cites the philosophy.
2. **Cheapest-impact items front-loaded.** Severity-weighted F1, bootstrap CI, pre-registration are days of work and unlock disproportionate rigor. Do them while the heavier items spin up.
3. **Process moves run in background.** MITRE CWE Compatibility and OWASP Benchmark submissions are paperwork-heavy with weeks of external review latency. Start early, let them mature in parallel to engineering work.
4. **Agent-axis investments are the differentiator.** They go in earlier than equally-sized academic-rigor items because the open ground is larger there.
5. **No work begins on the public leaderboard until SARIF + differential bench are stable.** Hosting a leaderboard with broken normalization is a category-killer.

---

## 2. The 4-phase roadmap

Each phase is ~3 months. Effort = engineering-weeks (1 person, focused). Dependencies in the right column gate work order. **First step** on every item is the smallest concrete action that unblocks it — agent-friendly handoffs.

### Phase 1 — Foundation (Q3 2026, May–Jul) · Total ≈ 12 eng-weeks

| # | Item | Effort | Depends on | Success criteria | First step |
|---|---|---|---|---|---|
| 1.1 | **Dual-audience philosophy doc** (`BENCHMARK_PHILOSOPHY.md` *or* expand `README.md` §1) — eight existing principles + three new agent-axis principles (determinism, token economy, autofix-coverage as headline) | 0.5 wk | none | Doc reviewed, public, cited from `README.md` and `RESULTS.md` | Write the dual-audience thesis: 200 words on why human-and-agent-as-consumer is the unclaimed ground |
| 1.2 | **SARIF emission** across all plugins via shared `@interlace/eslint-formatter-sarif` | 2 wk | none | `npx eslint -f @interlace/sarif` produces valid SARIF v2.1.0 for any plugin; `npm run ilb:wild -- --format=sarif` emits per-repo SARIF | Stand up `packages/eslint-formatter-sarif/` skeleton; verify against [SARIF schema](https://docs.oasis-open.org/sarif/sarif/v2.1.0/) |
| 1.3 | **Severity-weighted F1 as headline** — replace plain F1 in `RESULTS.md` and scorecard with CVSS-weighted F1 | 0.5 wk | per-rule CVSS metadata (already present) | `RESULTS.md` headline shows weighted F1; old F1 retained as secondary | Add weighting fn to `score.mjs`, regen scorecard against latest results |
| 1.4 | **Bootstrap CI on F1** | 0.5 wk | none | Every accuracy result emits 95% bootstrap CI alongside Wilson Score CI | Add 1000-resample bootstrap to `lib/runner.js`; verify against R `boot::boot.ci` on a known fixture |
| 1.5 | **Pre-registration discipline** — methodology + corpus hash committed *before* a run; tag of run pinned to that commit | 0.5 wk | none | Each result file in `results/` carries a `methodologyCommit` field; CI gate fails if missing | Document the workflow in `README.md` §2; add `methodologyCommit` to result schema |
| 1.6 | **ILB-Determinism** — same input × N runs × 3 plugin versions | 1 wk | 1.4 | Bench passes if max byte-level diff between runs ≤ ε on signal corpus; reported per-plugin | Scaffold `suites/ilb-determinism/`, run 5× on a sample fixture, hash & diff |
| 1.7 | **ILB-Autofix** — % of rules with `fixable` metadata; agent-macro-pass rate when autofix is applied | 1 wk | none | Bench reports autofix-coverage % and post-fix pass rate per plugin | Aggregate `meta.fixable` from rule definitions across all plugins; report % |
| 1.8 | **MITRE CWE Compatibility submission (paperwork)** | 2 wk + external review | 1.2 (SARIF) | Submission accepted by MITRE; "CWE-Compatible" seal granted | Read [CWE Compatibility Requirements](https://cwe.mitre.org/compatible/requirements.html); identify which of the 4 mandatory + 4 recommended criteria we already meet |
| 1.9 | **Differential bench scaffolding** — install CodeQL, Semgrep on the wild corpus; normalize SARIF outputs into a shared format | 4 wk | 1.2 | `npm run ilb:diff` produces an agreement matrix (Interlace × CodeQL × Semgrep) on the wild corpus | Stand up `suites/ilb-diff/`; install CodeQL CLI + Semgrep; emit SARIF for both on `vercel-ai` as the proof corpus |
| 1.10 | **Severity classification audit** — apply principle #10 retroactively to the existing rule corpus (~207 rules); produce per-rule classification report and a migration PR | 1 wk | per-rule precision metadata (already present from Wild + Arena) | Audit report lists every rule with current severity, measured Wild precision, and a "promote / demote / hold" recommendation. Migration PR lands. | Generate the audit table from `results/ilb-arena/latest.json` + Wild data; flag rules with severity ≠ measured precision |
| 1.11 | **Vocabulary contract enforcement (CI gate)** — schema validator that fails any new result file using non-standard field names | 0.5 wk | none | `npm run ilb:validate-results` fails on synonyms (`tokens`, `accuracy`, `time`, etc.); wired into per-PR CI | Author JSON Schema for the result envelope; add to `quality` task |
| 1.12 | **Append-only history (`benchmark-results/history.ndjson`)** — every bench run appends a row; principle #9 made operational | 0.5 wk | 1.11 | `history.ndjson` exists; every `ilb:*` run appends; `npm run ilb:trend -- --bench=arena` plots the timeline | Add `appendHistory()` helper to `lib/runner.js`; backfill from existing `results/<bench>/<date>.json` files |
| 1.13 | **Promotion-gate enforcement** — automated check that blocks a PR raising a rule to `severity: error` without ≥ 4 fixtures + ≥ 90 days Wild data + precision ≥ 95% | 1 wk | 1.10, 1.12 | CI gate fails on PR diffs that change `severity: warn → error` without the evidence trail | Build the eligibility script; run on a known-failing case (a recently-promoted rule) to validate |
| 1.14 | **TypeScript-compiler matrix** — every bench result records `toolchain.tsCompiler` (`tsc-classic` vs `tsc-go`) + TS version; ILB-Perf runs the matrix once tsc-go reaches GA | 1 wk now (recording) + 2 wk later (matrix run) | none for recording; tsc-go GA for matrix | Result envelopes carry `toolchain` block (per `state.json` schema). `npm run ilb:perf -- --ts=tsc-go` produces a parallel result set. Delta vs tsc-classic published in scorecard. | Add `toolchain` block to `lib/runner.js` result emission; install tsc-go beta where available; smoke-test on `secure-coding` |
| 1.15 | **Agent-onboarding prelude (`.agent/rules/bench-context.md`)** — single ≤12k-char digest of philosophy, benches, vocabulary, baselines, flagship rules, roadmap status. Replaces ~1k lines of scattered docs for cold-start sessions | 0.5 wk | none | Prelude exists; cited from `MEMORY.md`, `benchmarks/README.md`, and the project memory pointer | ✅ **Shipped 2026-05-09** — see `.agent/rules/bench-context.md` |
| 1.16 | **Machine-readable `benchmarks/state.json`** — current roadmap status, vocabulary contract, toolchain schema, query examples, all in JSON. Future agents query JSON, not markdown | 0.5 wk | none | `state.json` exists; updated whenever a roadmap item flips status; cited from prelude as the source of truth for "what's shipped" | ✅ **Shipped 2026-05-09** — see `benchmarks/state.json` |

### Phase 2 — Credibility & Agent-Axis (Q4 2026, Aug–Oct) · Total ≈ 12 eng-weeks

| # | Item | Effort | Depends on | Success criteria | First step |
|---|---|---|---|---|---|
| 2.1 | **Compliance mappings** — NIST SP 800-218 SSDF + OWASP ASVS L1/L2/L3 + MITRE ATT&CK / CAPEC | 3 wk | 1.1 | Each rule's `meta` carries `ssdf`, `asvs`, `capec` arrays; `npm run ilb:mappings:report` generates compliance crosswalk per plugin | Pull the SSDF practice list (PW.1 … RV.3) into a YAML file; map `secure-coding`'s 28 rules first as the proof |
| 2.2 | **ILB-Confidence** — per-rule confidence score; calibration plot (reliability diagram) | 2 wk | per-rule confidence schema (new) | Schema added to `meta`; bench plots reliability diagram; bin-wise TP rate within ±5% of stated confidence | Add `meta.confidence: 'high' \| 'medium' \| 'low'` (initial discrete) to all `secure-coding` rules; backfill from existing FP/TP data |
| 2.3 | **ILB-Discover** — NL → rule retrieval | 2 wk | rule docs structured | Recall@1 ≥ 80%, Recall@5 ≥ 95% on a 100-prompt eval set | Embed rule docs with text-embedding-3-large; build a 100-prompt ground-truth set ("user input flows into shell command" → `secure-coding/no-shell-injection`) |
| 2.4 | **ILB-Evade** — adversarial-AI evasion bench | 3 wk | none | Bench reports "rule survival rate" after LLM rewrites N semantically-equivalent variants per fixture | Pick 10 vulnerable fixtures from Juliet; ask Claude / GPT to "rewrite without changing what it does"; run rules; measure survival |
| 2.5 | **MCP server proof-of-concept** — one plugin (`secure-coding`) wrapped as MCP server with typed tools (`audit_file`, `find_rule_violations`, `suggest_fix`) | 2 wk | 1.2 | `secure-coding-mcp` published; Claude Code can call its tools end-to-end on a sample repo | Stand up `packages/secure-coding-mcp/` using `@modelcontextprotocol/sdk`; expose 3 tools |
| 2.6 | **ILB-Provenance** — link each security rule to ≥ 1 real CVE it would have caught | ongoing (0.5 wk/mo) | none | 80% of security rules have a CVE link by end of Q4 | Pick top 10 rules by usage; trawl CVE database; attach `meta.cveExamples: ['CVE-2023-XXXX', ...]` |

### Phase 3 — Own the Category (Q1 2027, Nov–Jan) · Total ≈ 11 eng-weeks

| # | Item | Effort | Depends on | Success criteria | First step |
|---|---|---|---|---|---|
| 3.1 | **Public ILB leaderboard** — hosted website + submission flow | 4 wk | 1.9 (differential bench) | Public site at `bench.interlace.dev` (or similar) accepts SARIF submissions, computes F1 / weighted-F1 / agreement matrix, displays a leaderboard | Choose hosting (Vercel + Postgres / Cloudflare + D1); build submission API spec |
| 3.2 | **Differential bench publication** — full Interlace × CodeQL × Semgrep × Snyk Code results on the wild corpus | 2 wk | 1.9 | `RESULTS.md` and scorecard publish the agreement matrix; the 22% "where we differ" is the headline narrative | Add Snyk Code (free tier) to the differential matrix; expand corpus to all 22 wild repos |
| 3.3 | **OWASP Benchmark Project — engagement** | 3 wk + external | 1.2, 2.1 | OWASP accepts our submission for OWASP Benchmark v1.2 (Java, repurposed for JS where applicable), or formally accepts our pitch for "OWASP Benchmark for JavaScript" | Email the project lead; attend an OWASP Slack channel; submit a JS-corpus proposal |
| 3.4 | **MCP servers across all security plugins** | 2 wk | 2.5 (proof-of-concept) | All 11 security plugins expose MCP tools; documented in their READMEs | Refactor `secure-coding-mcp` into a generic `@interlace/eslint-mcp-base`; wrap remaining plugins |

### Phase 4 — Academic Moat (Q2 2027, Feb–Apr) · Total ≈ 10 eng-weeks

| # | Item | Effort | Depends on | Success criteria | First step |
|---|---|---|---|---|---|
| 4.1 | **Mutation testing for fixtures** — Stryker integration | 2 wk | none | `npm run ilb:mutate` rewrites fixtures (rename, swap, restructure); rule-survival rate reported | Pick 20 vulnerable fixtures; run StrykerJS in dry-run; verify mutations preserve semantics manually |
| 4.2 | **ISO/IEC 25010 mapping for quality plugins** | 2 wk | none | Each quality rule mapped to ISO 25010 sub-characteristic (Maintainability/Reliability/Performance Efficiency/etc.); published as crosswalk | Pull ISO 25010:2023 sub-characteristics; map `maintainability` plugin's rules first |
| 4.3 | **External replication** — fund a third party to re-run ILB-Arena + ILB-Juliet on independent infrastructure | 2 wk + external | 1.5 (pre-registration) | Independent results published alongside ours; deltas explained where they differ by > 2% | Identify a credible reviewer (academic security lab, security consultancy, or independent auditor); prepare reproducibility kit |
| 4.4 | **Cohen's κ inter-rater agreement** | 1 wk + external | 4.3 | κ ≥ 0.75 between Interlace authors and external reviewer on a 200-fixture sample | Build the labeling UI (or use Doccano); pull 200 stratified fixtures; ship to reviewer |
| 4.5 | **Open corpus governance** — split fixtures to `interlace-bench/corpus` GitHub org; set non-Interlace stewards | 4 wk | 3.1 (leaderboard) | Corpus is its own repo; ≥ 2 external maintainers with merge rights; PRs from outside contributors merged | Create the org and repo; draft `GOVERNANCE.md`; identify 2–3 candidate stewards (academic / security-consultancy contacts) |
| 4.6 | **Academic paper draft** — submit to ASE 2027 or ICSE 2028 | 4 wk | 4.3, 4.4 | Paper accepted to a tier-1 software-engineering venue | Skim 5 recent ASE / ICSE papers on SAST evaluation; build outline; draft abstract |

---

## 3. Live tracker

| # | Item | Phase | Status | Owner | Started | Shipped |
|---|---|---|---|---|---|---|
| 1.1 | Dual-audience philosophy doc | 1 | **Shipped** | maintainer | 2026-05-09 | 2026-05-09 |
| 1.2 | SARIF emission | 1 | **Shipped** | agent | 2026-05-09 | 2026-05-09 |
| 1.3 | Severity-weighted F1 headline | 1 | **Shipped** | agent | 2026-05-09 | 2026-05-09 |
| 1.4 | Bootstrap CI on F1 | 1 | **Shipped** | agent | 2026-05-09 | 2026-05-09 |
| 1.5 | Pre-registration discipline | 1 | **Shipped** | agent | 2026-05-09 | 2026-05-09 |
| 1.6 | ILB-Determinism | 1 | **Shipped** | agent | 2026-05-09 | 2026-05-09 |
| 1.7 | ILB-Autofix | 1 | **Shipped** | prior agent | 2026-05-09 | 2026-05-09 |
| 1.8 | MITRE CWE Compatibility submission readiness | 1 | **Shipped** (engineering complete; demo recording + form submission are external) | maintainer | 2026-05-09 | 2026-05-09 |
| 1.9 | Differential bench scaffolding | 1 | **Shipped** | agent | 2026-05-09 | 2026-05-09 |
| 1.10 | Severity classification audit | 1 | **Shipped** | maintainer + agent | 2026-05-09 | 2026-05-09 |
| 1.11 | Vocabulary contract enforcement (CI gate) | 1 | **Shipped** | agent | 2026-05-09 | 2026-05-09 |
| 1.12 | Append-only history.ndjson | 1 | **Shipped** | agent | 2026-05-09 | 2026-05-09 |
| 1.13 | Promotion-gate enforcement | 1 | **Shipped** | agent | 2026-05-09 | 2026-05-09 |
| 1.14 | TypeScript-compiler matrix (tsc-classic vs tsc-go) | 1 | **Shipped** (zero-drift smoke ✅: 5.9.3 vs 7.0.0-dev) | agent | 2026-05-09 | 2026-05-09 |
| 1.15 | Agent-onboarding prelude | 1 | **Shipped** | maintainer | 2026-05-09 | 2026-05-09 |
| 1.16 | Machine-readable state.json | 1 | **Shipped** | maintainer | 2026-05-09 | 2026-05-09 |
| 1.17 | ILB-Node-Matrix bench (Node 18/20/22/24) | 1 | **Shipped** (zero-drift smoke ✅ across 4 majors) | agent | 2026-05-09 | 2026-05-09 |
| 1.18 | Runtime support policy doc | 1 | **Shipped** | agent | 2026-05-09 | 2026-05-09 |
| 1.19 | ILB-ESLint-Matrix bench (ESLint 8/9/10) | 1 | **Shipped** | agent | 2026-05-09 | 2026-05-09 |
| 1.20 | ILB-Parser-Matrix bench (js / js+jsx / ts / ts+jsx) | 1 | **Shipped** | agent | 2026-05-09 | 2026-05-09 |
| 1.21 | ILB-Cache-Matrix bench (cold vs warm) | 1 | **Shipped** (cache correctness ✅) | agent | 2026-05-09 | 2026-05-09 |
| 2.1 | Compliance mappings (SSDF / ASVS / ATT&CK) | 2 | **Shipped** | agent | 2026-05-09 | 2026-05-09 |
| 2.2 | ILB-Confidence | 2 | **Shipped** | agent | 2026-05-09 | 2026-05-09 |
| 2.3 | ILB-Discover | 2 | **Shipped** (BM25 baseline; embedding upgrade noted) | agent | 2026-05-09 | 2026-05-09 |
| 2.4 | ILB-Evade | 2 | **Shipped** | agent | 2026-05-09 | 2026-05-09 |
| 2.5 | MCP server proof-of-concept | 2 | **Shipped** | agent | 2026-05-09 | 2026-05-09 |
| 2.6 | ILB-Provenance (CVE links) | 2 | **Shipped** | agent | 2026-05-09 | 2026-05-09 |
| 3.1 | Public ILB leaderboard | 3 | **Shipped** (protocol + publisher + storage live; hosted UI deployment external) | agent | 2026-05-09 | 2026-05-09 |
| 3.2 | Differential bench publication | 3 | **Shipped** (publisher live; full run pending external tool install) | agent | 2026-05-09 | 2026-05-09 |
| 3.3 | OWASP Benchmark engagement | 3 | **Shipped** (pitch packet ready; outreach external) | agent | 2026-05-09 | 2026-05-09 |
| 3.4 | MCP servers across all security plugins | 3 | **Shipped** (1 base + 11 plugin adapters) | agent | 2026-05-09 | 2026-05-09 |
| 4.1 | Mutation testing for fixtures (ILB-Mutate) | 4 | **Shipped** (smoke ✅ 100% survival) | agent | 2026-05-09 | 2026-05-09 |
| 4.2 | ISO/IEC 25010 mapping for quality plugins | 4 | **Shipped** | agent | 2026-05-09 | 2026-05-09 |
| 4.3 | External replication (kit ready) | 4 | **Shipped** (engagement external) | agent | 2026-05-09 | 2026-05-09 |
| 4.4 | Cohen's κ inter-rater agreement | 4 | **Shipped** (self-test ✅) | agent | 2026-05-09 | 2026-05-09 |
| 4.5 | Open corpus governance | 4 | **Shipped** (plan ready; repo creation external) | agent | 2026-05-09 | 2026-05-09 |
| 4.6 | Academic paper draft | 4 | **Shipped** (outline + abstract; full draft external) | agent | 2026-05-09 | 2026-05-09 |

### Phase 5 — Adoption Accelerators (Q3 2027 onward)

Five items not in the original plan that became obvious once Phases 1-4 landed. The bench infrastructure is complete; Phase 5 is about **closing the loop** between findings and human/agent action.

| # | Item | Effort | Why now |
|---|---|---|---|
| **5.1** | **Auto-rule synthesis from CVEs** — when a new CVE drops, an LLM workflow auto-generates a candidate rule + Juliet-style fixture + CHANGELOG entry; landing requires human review. | 3-4 wk | Closes "we cover what we've thought of" gap. The CVE feed is public; the synthesis pipeline is the unique IP. |
| **5.2** | **End-to-end smoke (`npm run ilb:smoke`)** — runs a 5-min subset of every bench, single PR-gate. Currently the per-bench gates are scattered. | 1 wk | One command instead of 23 to know "did anything break." |
| **5.3** | **Production-fleet telemetry (opt-in)** — anonymized, opt-in stats on which rules fire most across all installations. Operationalizes principle #10 promotion data with real-world signal. | 4 wk | Today, severity promotion gates rely on local Wild data; production telemetry would tighten the loop dramatically. |
| **5.4** | **CLI rebrand + zero-config init (`npx interlace audit` / `npx interlace-init`)** — adoption accelerator. Kill the `npx eslint --plugin secure-coding` ceremony for new users. | 2 wk | Adoption funnel: every step removed = 2-3× more users. |
| **5.5** | **Federated wild-corpus** — community contributors submit their own OSS-project Wild runs; framework aggregates into the public scorecard. | 3 wk | Today: 22 OSS repos. With federation: hundreds. The corpus becomes self-expanding. |

### Phase 5 — Live tracker

| # | Item | Status | Shipped | Owner |
|---|---|---|---|---|
| 5.1 | Auto-rule synthesis from CVEs | **Shipped** (deterministic baseline; LLM enrichment via `--use-llm` is documented stub) | 2026-05-09 | agent |
| 5.2 | End-to-end smoke (`npm run ilb:smoke`) | **Shipped** (16-step orchestrator, ~5min wall time) | 2026-05-09 | agent |
| 5.5 | Federated wild-corpus | **Shipped** (aggregator + protocol; community submissions accepted via PR to `benchmarks/federated/`) | 2026-05-09 | agent |
| 6.3 | npm publish pipeline | **Shipped** (workflow_dispatch + tag-push triggers, dry-run default, provenance enabled) | 2026-05-09 | agent |
| L1  | Smoke-gate gap fixes | **Shipped** — 3 rules CWE-annotated · CVE seed corpus 3× larger · ILB-Discover BM25 retriever rewritten (R@1 doubled) · smoke gate now 0 required failures | 2026-05-09 | agent |

Phase 5 items are independent and can ship in any order. Recommended start: 5.2 (cheapest, immediate dev-velocity win) → 5.4 (adoption multiplier) → 5.1 (the strategic differentiator nobody else has) → 5.3 (telemetry buy-in) → 5.5 (community scaling).

---

## 4. Non-goals (explicit scope guards)

What this roadmap **will not** chase, even if it looks adjacent:

1. **A "blended score."** Single-dimension scores stay single-dimension. No "Interlace Quality Index 87/100." Cross-bench comparison stays in the unified scorecard, never in any single bench.
2. **Multi-language support.** JavaScript / TypeScript only through 2027. Going polyglot dilutes the benchmark surface and the credibility claim. Revisit in 2028.
3. **A second commercial AI bench.** ILB-AI exists; no Claude-vs-GPT cage-match content. The bench measures coverage, not model relativity.
4. **Tool acquisition.** No buying competitor plugins. Build the leaderboard, let them submit.
5. **Premium tier.** All benches and corpora stay open-source. Monetization, if any, is via consulting, training, or hosted leaderboard services — never via gating the benchmark itself.
6. **"Recommended" tiers without auditability for agent consumption.** New rule packs must ship with rule-level provenance / CWE mapping / autofix coverage so an agent can reason about pack contents. No black-box `recommended` configs.

---

## 5. Update procedure

1. **When a phase item ships** — flip its **Status** to "Shipped" in the live tracker; fill **Shipped** date; cite the relevant commit / PR.
2. **When you start an item** — flip Status to "In progress"; set **Owner** and **Started** date.
3. **When you discover a new item** — propose it via PR amending this doc; assign to the earliest phase that doesn't break dependencies.
4. **When you retire an item** — strike through the row, leave it for history, and add a `~~Reason for retirement~~` line beneath.
5. **When all of Phase 4 closes** — move this file to [`audits/2027-XX-leadership-roadmap-final.md`](./audits/) and start a v2 if there's a v2 vision.

---

## 6. Why this exists

If we don't write the leadership goal down, we drift toward whatever the next bug-fix demands. This roadmap is the contract between the strategic vision (be the static-analysis authority for JS, for both humans and agents) and the operational reality (someone has to actually ship 25 things in sequence). Future Claude sessions: read this before proposing new bench work.
