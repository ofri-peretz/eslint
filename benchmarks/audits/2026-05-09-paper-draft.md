# Academic Paper — Draft Outline

> **Roadmap.** [LEADERSHIP_ROADMAP.md](../LEADERSHIP_ROADMAP.md) §4.6.
> **Target venues.** ASE 2027 (deadline ~Mar 2027), ICSE 2028 (deadline ~Aug 2027), SecDev 2027 (rolling).
> **Status (2026-05-09).** Outline + abstract drafted. Full paper write-up + figure generation are the next external actions.

## Working title

**Interlace Lint Bench: A Reproducible Public Benchmark for JavaScript Static Analysis Across the Human–Agent Interface**

## Abstract (300 words)

Static-analysis tools for JavaScript and TypeScript are evaluated today by their authors using ad-hoc methodologies, producing F1 numbers that don't compare across vendors. We present **Interlace Lint Bench (ILB)** — the first public, reproducible, multi-dimensional benchmark for JS/TS static analysis, designed to serve both human reviewers and AI coding agents as primary consumers.

ILB comprises 23 single-dimension benches across six axes: synthetic accuracy (CWE-mapped corpora following OWASP Benchmark methodology), real-world exposure (1.7M LoC across 22 popular OSS repos), adversarial resilience (rule-survival rate under semantic mutations and LLM-generated rewrites), runtime / parser / cache portability matrices, agent-axis benches measuring per-finding token cost / determinism / NL-to-rule retrievability, and head-to-head comparisons against CodeQL, Semgrep, Snyk Code, and 18 other ESLint plugins. All numbers are CVSS-weighted F1 with bootstrap 95% confidence intervals, pre-registered against a methodology commit, and append-only in `history.ndjson`. The corpus is governed by an external multi-org steward council to remove the "tool author owns the test" conflict.

We apply ILB to a 207-rule security + quality plugin ecosystem and report: F1 98.8% on the head-to-head security arena (next-best 47.5%), 100% recall on the CWE Top-25 corpus across six categories, zero rule-output drift across {Node 18/20/22/24} × {tsc-classic, tsc-go} × {ESLint 8/9/10} × {js, jsx, ts, tsx} × {cold, warm cache} (32 cells), and Cohen's κ ≥ 0.78 against an independent reviewer's SARIF on a 200-fixture sample. The full submission protocol, plus generated MCP servers exposing every plugin as a typed agent tool, are open-source. We argue that the agent-axis dimensions — determinism, autofix coverage, NL discoverability — are necessary additions to the static-analysis evaluation contract in the era of AI-generated code.

**Artifacts available** at https://github.com/ofri-peretz/eslint and (for blind review) at the supplemental materials site.

## Section outline

### 1. Introduction (~1.5 pages)
- The problem: static-analysis claims are unfalsifiable when the same party authors rules + corpus + scoring.
- The shift: AI coding agents are now primary consumers of lint output (Claude Code, Cursor, Copilot integrations).
- Contributions: (a) the first public reproducible JS/TS lint bench, (b) the agent-axis dimensions as a new evaluation contract, (c) an externally-governed corpus, (d) the production-grade implementation as artifact.

### 2. Related work (~1.5 pages)
- **OWASP Benchmark Project** — Java predecessor; we adopt its BAS scoring formula, expand to JS, run multi-tool.
- **NIST SARD / Juliet Test Suite** — synthetic-corpus design pattern we mirror.
- **MLPerf, SWE-Bench, HumanEval** — submission-leaderboard-as-authority model we adopt for agent-axis.
- **Cohen's κ in software engineering** — Trail of Bits, NCC Group, academic SAST evaluations as inter-rater precedent.
- **Mutation testing** (Stryker, PIT) — sibling methodology to ILB-Mutate / ILB-Evade.

### 3. The benchmark (~3 pages)
- **3.1 Six axes** — accuracy / exposure / robustness / portability / agent-axis / differential. Why each.
- **3.2 The vocabulary contract** — Cost · Effectiveness · Latency. Standard field names enforced by CI.
- **3.3 Pre-registration + append-only history** — how reproducibility survives over time (principle #9).
- **3.4 The 23 benches at a glance** — the table from `bench-context.md` §4.
- **3.5 Severity-weighted F1** — CVSS-weighted scoring as a more meaningful headline than plain F1.
- **3.6 Agent-axis dimensions** — per-finding token cost (ILB-LLM-Tokens), autofix coverage (ILB-Autofix), determinism (ILB-Determinism), NL-to-rule retrieval (ILB-Discover), adversarial-rewrite resilience (ILB-Evade), confidence calibration (ILB-Confidence). Why they matter for agents specifically.

### 4. Implementation (~2 pages)
- Plugin → MCP server fleet (1 base + 11 adapters, < 30 lines each)
- SARIF v2.1.0 emission for cross-tool comparison
- Toolchain matrix instrumentation (`benchmarks/lib/toolchain.mjs`)
- Open governance + submodule-pinned corpus

### 5. Evaluation (~3 pages)
- **5.1 Head-to-head accuracy** — 18-plugin arena, F1 + Wilson + bootstrap CI.
- **5.2 Real-world exposure** — 22 OSS repos, finding density, plugin activation, cache speedup, ms/file.
- **5.3 Cross-toolchain stability** — zero drift across the 32-cell matrix.
- **5.4 Adversarial robustness** — ILB-Evade rule survival under cosmetic + semantic mutations.
- **5.5 Differential** — Interlace × CodeQL × Semgrep × Snyk Code agreement matrix; the disagreement region is the interesting signal.
- **5.6 Inter-rater κ** — agreement against an independent reviewer.
- **5.7 Agent-axis numbers** — per-finding token cost, autofix coverage %, NL-retrieval Recall@1/@5, calibration ECE.

### 6. Discussion (~1.5 pages)
- **6.1 What the disagreement region tells us** about the limits of every individual SAST tool.
- **6.2 Agent-axis findings** — most existing SAST tools fail the determinism contract.
- **6.3 Open corpus governance** as an answer to "tool author owns the test."
- **6.4 Limitations** — JS/TS-only, no runtime / dynamic analysis, no Bun / Deno / Workerd matrix yet.

### 7. Conclusion (~0.5 page)
- ILB is now the recommended evaluation harness for any new JS/TS static-analysis tool.
- Submission protocol open; community welcome.

### 8. Artifact appendix
- Reproducibility kit + Cohen's κ comparison tooling.
- Direct links to every script / corpus / result JSON.

## Figures (to generate)

1. **Cross-bench scorecard heatmap** — 23 benches × 5 SAST tools, color-coded by F1 / pass rate.
2. **Toolchain matrix grid** — 32 cells × pass/fail, demonstrating zero drift.
3. **ILB-Evade survival rate by mutator** — bar chart per mutator, per plugin.
4. **Differential agreement Venn** — Interlace × CodeQL × Semgrep × Snyk overlap on the wild corpus.
5. **Token cost histogram** — per-finding tokens by plugin (the agent-axis cost claim).
6. **Confidence reliability diagram** — declared vs empirical precision per bucket.

## Author list (placeholder)

- Ofri Peretz (Interlace, lead)
- *(External corpus stewards as co-authors per their contribution)*
- *(Independent reviewer per κ collaboration as co-author)*

## Submission timeline

| Milestone | Target |
| :--- | :--- |
| Outline + abstract (this doc) | 2026-05-09 ✅ |
| Section 3 + 4 first draft | 2026-08-31 |
| External κ replication landed (Phase 4.3 + 4.4) | 2026-10-31 |
| Full draft ready for internal review | 2026-12-31 |
| ASE 2027 submission deadline | ~2027-03-15 |
| Backup: ICSE 2028 submission | ~2027-08-31 |

## Pre-submission checklist

- [x] Outline + abstract
- [ ] Full draft sections 1–7
- [ ] All 6 figures generated from real data
- [ ] Artifact-evaluation packet (the existing repo + reproducibility README)
- [ ] External κ replication results in §5.6
- [ ] Internal review by 2 external SAST researchers
- [ ] Anonymized for double-blind submission (separate fork)
