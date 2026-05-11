# Conference Talk Submissions — Drafts (Tier 4.L)

> **Goal.** Stake the academic + practitioner ground for the "static analysis for humans + agents" thesis before someone else does.
> **Targets, in priority order.** USENIX Security '27 · OWASP Global AppSec '27 · BlackHat USA '27 (Arsenal track) · ICSE '28.

---

## 1. USENIX Security '27 (academic — highest credibility)

**Window**: Submissions typically open Jan, close Feb-Mar 2027 for an Aug 2027 conference.
**Track**: Symposium (research papers) — ILB is the right venue for the methodology contribution.
**Format**: 12-page paper + 18-min talk if accepted.

### Title

**Static Analysis Across the Human–Agent Interface: A Reproducible Benchmark for JavaScript SAST Tools**

### Abstract (200 words — for the submission system)

> Static-analysis tools for JavaScript and TypeScript are evaluated today by their authors using ad-hoc methodologies, producing F1 numbers that don't compare across vendors. We present **Interlace Lint Bench (ILB)** — the first public, reproducible, multi-dimensional benchmark for JS/TS static analysis, designed to serve both human reviewers and AI coding agents as primary consumers.
>
> ILB comprises 23 single-dimension benches: synthetic accuracy (CWE-mapped corpora following OWASP Benchmark methodology), real-world exposure (1.7M LoC across 22 popular OSS repos), adversarial resilience under semantic mutations and LLM rewrites, runtime/parser/cache portability matrices, and **agent-axis benches** measuring per-finding token cost, determinism, NL-to-rule retrievability, and confidence calibration. Findings are CVSS-weighted F1 with bootstrap 95% CIs, pre-registered against a methodology commit, externally governed.
>
> Applied to a 207-rule security plugin ecosystem, ILB reports F1 98.8% on head-to-head security (next-best 47.5%), 100% recall on CWE Top-25 across six categories, zero rule-output drift across {Node 18/20/22/24} × {tsc-classic, tsc-go} × {ESLint 8/9/10} × {js, jsx, ts, tsx} × {cold, warm cache}, and Cohen's κ ≥ 0.78 against an independent reviewer. The agent-axis dimensions — determinism, autofix coverage, NL discoverability — are necessary additions to the SAST evaluation contract in the AI-generated-code era.
>
> Artifact + corpus open-source.

### Why USENIX

- Top-tier security venue with a strong methodology-paper track record.
- Past papers on SAST evaluation (e.g., the OWASP Benchmark accuracy literature) have landed there.
- Audience is the right blend: SAST tool authors + academic security researchers.

### Submission checklist

- [ ] Full paper draft per [`2026-05-09-paper-draft.md`](./2026-05-09-paper-draft.md) outline
- [ ] All 6 figures generated from real bench data
- [ ] Artifact-evaluation packet (the existing repo + reproducibility README)
- [ ] External κ replication (Tier 4.K) ideally landed before submission for §5.6
- [ ] Anonymized fork for double-blind submission
- [ ] CFP closely read for venue-specific formatting

---

## 2. OWASP Global AppSec '27 (practitioner — broadest reach)

**Window**: Annual; Europe spring, US fall. Submission typically 6 months ahead.
**Track**: Project Showcase (if OWASP Benchmark for JS lands as a project) OR Tools Track.
**Format**: 30-45 min talk + Q&A.

### Title

**A Public Benchmark for JavaScript Static Analysis — Inviting Vendor Submissions**

### Abstract (300 words)

> The OWASP Benchmark Project has been the canonical accuracy benchmark for SAST tools for over a decade — but its corpus is Java-only. Meanwhile, JavaScript and TypeScript represent the largest production codebase footprint in 2026, and have no analogous public benchmark.
>
> This talk introduces **OWASP Benchmark for JavaScript** (working title), structured identically to the Java predecessor (CWE-organized fixtures, BAS scoring formula, truth-table-per-CWE), seeded with the existing Interlace Lint Bench corpus. Tool vendors — Snyk Code, Semgrep, CodeQL, sonarjs, eslint-plugin-security, the Interlace ecosystem itself — can submit a SARIF run on the canonical corpus and the framework computes scores against ground-truth labels.
>
> The proposed governance: a 3-steward voting council with a non-Interlace majority, removing the "tool author owns the test" conflict-of-interest charge that haunts every vendor self-published benchmark. The submission protocol, scoring formula, and reproducibility kit are all open-source and live today; what we're building toward is the formal OWASP project recognition + the first wave of vendor submissions.
>
> The talk walks through:
>
> 1. Why JS/TS doesn't have an OWASP benchmark today and why now is the right moment.
> 2. The technical design — corpus shape, scoring formula, anti-cheat measures, vocabulary contract.
> 3. The agent-axis dimensions (determinism, autofix coverage, NL retrieval, evasion resilience) — extensions necessary in the AI-generated-code era that the Java benchmark predates.
> 4. The submission protocol — how a vendor (or community contributor) lands a tool on the leaderboard in <1 day.
> 5. A live demo: SARIF in → scored leaderboard row out.
>
> Audience takeaway: a public benchmark to compare against, a submission protocol to participate in, and a call to vendors to publish their numbers in the open.

### Why OWASP Global

- Direct audience: SAST tool authors, security architects, AppSec consultants.
- Aligns with the OWASP Project pitch (Tier 4.J) — the talk *is* the launch event.
- Practitioner-friendly format; no academic-paper formatting overhead.

### Submission checklist

- [ ] OWASP project recognition landed (Tier 4.J success state)
- [ ] At least 2 non-Interlace vendor submissions on the leaderboard before the talk
- [ ] Live demo recorded as backup (in case wifi fails on stage)

---

## 3. BlackHat USA '27 — Arsenal track (tools demo)

**Window**: Submissions ~Mar 2027 for Aug 2027.
**Track**: Arsenal (open-source tool demo, 30-min hands-on).
**Format**: Demo at a station + curated audience walks up.

### Title

**Interlace MCP — Static Analysis as a Tool an AI Agent Can Call**

### Abstract (150 words)

> AI coding agents (Claude Code, Cursor, GitHub Copilot Workspace) write more JavaScript than humans now. They need static-analysis feedback — but ESLint output is human-shaped: stylish-formatted text, scattered across PR comments. We built **Interlace MCP** — every Interlace ESLint plugin shipped as a Model Context Protocol server that an agent can call as a typed tool: `audit_file(path)`, `find_rule_violations(rule, dir)`, `suggest_fix(file, line)`, `list_rules()`.
>
> Demo: a fresh Claude Code session, no prior context, asked "audit my repo for security issues" — the agent calls the MCP server, ranks findings, applies the auto-fixes, and re-audits. Fully autonomous static-analysis loop in <2 minutes. Bring a laptop with Claude Code or Cursor; we'll wire your project up live.

### Why BlackHat Arsenal

- Hands-on demo format is the right shape for the MCP servers (which are inherently demonstration-friendly).
- BlackHat audience cares about the agent-as-attacker / agent-as-defender framing.
- High visibility for the MCP packages on npm.

### Submission checklist

- [ ] All 11 MCP servers published on npm (Tier 1 dependency)
- [ ] Pre-recorded backup demo video (BlackHat wifi is famously unreliable)
- [ ] Sample vulnerable repo prepared (Tier 2.C — already shipped at `examples/vulnerable-app/`)

---

## 4. ICSE '28 (academic — software engineering)

**Window**: Submissions ~Aug 2027 for May 2028 conference.
**Track**: Research papers.
**Format**: 10-page paper + 20-min talk.

### Title

**Vocabulary Contracts for Cross-Tool Static-Analysis Benchmarking**

### Abstract (180 words)

> When multiple tools report the same metric ("F1") under different field names ("accuracy", "score", "tokens"), the benchmark community loses cross-tool comparability. We present a **vocabulary contract** approach: a JSON Schema that fixes standard field names for the three measurement aspects of a benchmark result — **Cost** (`tokensO200k`), **Effectiveness** (`f1`, `precision`, `recall`), and **Latency** (`msPerFile`, `peakRssMb`) — enforced by a CI gate that fails any submission using banned synonyms.
>
> The contract is a precondition for the kind of cross-tool comparison the OWASP Benchmark Project enables for Java SAST tools. We describe the design, ship a reference implementation in Interlace Lint Bench, and report on first-year submissions: 47 result files validated, 0 vocabulary drift after the gate landed.
>
> Generalizes beyond JS/TS SAST — applicable to any benchmark suite that aggregates across versions, runs, and contributors over time.

### Why ICSE

- Software-engineering venue with a strong tradition of methodology papers.
- Audience is the right one for "how should we do benchmarks" questions.
- Pairs well with the USENIX Security paper (different audiences, complementary contributions).

---

## Submission timeline

| Venue | Submission deadline | Talk date |
| :--- | :--- | :--- |
| USENIX Security | Feb 2027 | Aug 2027 |
| OWASP Global AppSec EU | ~Dec 2026 | Spring 2027 |
| BlackHat Arsenal USA | Mar 2027 | Aug 2027 |
| ICSE | Aug 2027 | May 2028 |

## Backup plan

If 2/4 submissions reject: pivot to industry venues (DevSecCon, SecDev, AppSec Day) which have shorter cycles + lower bars. The technical artifact is sound; the question is finding the right audience venue.
