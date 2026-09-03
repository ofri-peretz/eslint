# OWASP Benchmark for JavaScript — Project Proposal

> **Roadmap.** [LEADERSHIP_ROADMAP.md](../LEADERSHIP_ROADMAP.md) §3.3.
> **Audience.** OWASP Project Committee, OWASP Benchmark Project lead, OWASP Foundation Slack #benchmark channel.
> **Submitter.** Ofri Peretz (Interlace ESLint Ecosystem maintainer).
> **Status (2026-05-09).** Pitch + readiness packet drafted. Outreach is the only external action.

## 1. The proposal in one paragraph

The [OWASP Benchmark Project](https://owasp.org/www-project-benchmark/) is the de-facto leaderboard for SAST tool accuracy — vendors like Veracode, Fortify, Checkmarx, and SonarSource publish their BAS (Benchmark Accuracy Score) numbers against it as evaluation material. **The corpus is Java-only.** JavaScript / TypeScript — the language with the largest enterprise codebase footprint after Java — has no analogous corpus. This proposal: **OWASP Benchmark for JavaScript**, structured identically to the Java version (CWE-organized fixtures + `truthtable.csv` + BAS scoring formula), seeded with the existing Interlace bench corpus, and operated under OWASP project governance.

## 2. Why now

- **JS/TS is now the largest production codebase footprint.** [Datadog State of Node](https://www.datadoghq.com/state-of-nodejs/) and [GitHub Octoverse](https://octoverse.github.com/) show JS/TS ahead of Java in raw repo count and contributor activity.
- **There is no canonical SAST corpus for JS.** Tool vendors (CodeQL, Semgrep, Snyk, Sonar) each publish their own internal numbers; nothing is comparable across vendors.
- **AI-generated JS is now mainstream.** Without a public corpus, "are LLM-shipped JS projects safe?" has no defensible answer.
- **The community is ready.** OWASP ASVS, OWASP Top 10, and OWASP LLM Top 10 all increasingly cite JS/TS examples; a benchmark is the missing complement.

## 3. What we'd contribute

Interlace is prepared to seed the OWASP Benchmark for JavaScript corpus with:

1. **Existing fixtures.** [`benchmarks/corpus/`](../corpus/) contains CWE-organized vulnerable + safe fixtures across CWE-022, -078, -079, -089, -798, -918. ~80 fixtures today; we expand to 200+ over the OWASP-review window.
2. **Scoring tooling.** [`benchmarks/score.mjs`](../score.ts) implements the BAS formula (TPR − FPR) per CWE + aggregate, plus Wilson Score CI and bootstrap CI on F1 — already in use today, output schema matches the existing OWASP Benchmark JSON format.
3. **Per-tool runners.** Adapters exist for Interlace, CodeQL, Semgrep, Snyk Code (see [`benchmarks/suites/ilb-diff/run.mjs`](../suites/ilb-diff/run.ts)). These become the basis for tool-vendor self-attestation under the OWASP Benchmark process.
4. **Reproducibility infrastructure.** Pre-registration via `methodologyCommit`, append-only history in `benchmark-results/history.ndjson`, vocabulary contract enforcement via [`scripts/ilb-validate-results.mjs`](../../scripts/ilb-validate-results.ts) — all already in production.
5. **Operating support.** Interlace agrees to handle PR triage, CI maintenance, and corpus expansion under OWASP governance for the first 24 months. Long-term governance belongs to OWASP.

## 4. What we'd need from OWASP

1. **Project recognition.** Either: (a) an "OWASP Benchmark for JavaScript" sub-project under the OWASP Benchmark umbrella, or (b) a new OWASP Lab project with a clear path to OWASP Production status.
2. **Repository hosting.** Dedicated GitHub org or sub-repo (`OWASP/benchmark-javascript` or similar).
3. **Project lead approval.** Tagged review by the OWASP Benchmark Project lead.
4. **Coordination on the truth-table format.** OWASP Benchmark v1.2 uses [`expectedresults-1.2.csv`](https://github.com/OWASP-Benchmark/BenchmarkJava/blob/master/expectedresults-1.2.csv); we'd adopt the same format (per-test-case CWE + expected outcome) for cross-language consistency.

## 5. Compatibility with the existing OWASP Benchmark

- **Same scoring formula.** BAS (Youden's J statistic) per CWE + aggregate. Identical to the Java version's published methodology.
- **Same truth-table format.** Mirrors `expectedresults-1.2.csv` exactly so cross-language tooling (vendor dashboards, etc.) works without modification.
- **Same submission protocol.** Tool vendors submit a single SARIF or per-tool-format file; the bench harness scores against the truth table. The vocabulary contract is a strict superset of the OWASP Benchmark output format.

## 6. Why this benefits OWASP

- **Closes a gap that's been open for 5+ years.** Multiple GitHub issues / Slack threads in the OWASP Benchmark project have asked "when will there be a JS version?"
- **Brings new vendor participation.** SAST vendors that don't currently publish OWASP Benchmark numbers (Snyk, Semgrep — both JS-first) gain a public leaderboard to compete on.
- **Strengthens the OWASP Top 10 / OWASP LLM Top 10 evidence base.** Rather than vendors citing their own internal numbers, the OWASP Top 10 working group can cite OWASP-operated benchmark numbers when ranking severities.
- **Full reproducibility at zero ongoing cost.** Bench is open-source; CI is GitHub Actions; no infrastructure spend on OWASP's side.

## 7. Decision request

I'm requesting a 30-minute call with the OWASP Benchmark Project lead + an OWASP Project Committee member to walk through:

1. The existing Interlace bench infrastructure (live demo: `npm run ilb:juliet`, `npm run ilb:diff`).
2. The proposed corpus expansion plan (~200 fixtures in 90 days, all CWE-mapped, peer-reviewed via second-rater per principle #5).
3. The governance model (Interlace operates Year 1, OWASP-controlled steering by Year 2).
4. Whether OWASP prefers a sub-project under Benchmark or a fresh Lab project.

## 8. Outreach plan

- **Week 1 (post-2026-05-09).** Email the OWASP Benchmark Project lead (current chair listed on the [project page](https://owasp.org/www-project-benchmark/)). Cite this document.
- **Week 2.** Post in OWASP Foundation Slack #benchmark channel with the live demo links.
- **Week 3.** Request an agenda slot at the next OWASP Project Committee call.
- **Weeks 4–8.** Iterate on corpus expansion + governance per OWASP feedback.
- **Week 8+.** Submit project application via the standard [OWASP Lab Project process](https://owasp.org/www-policy/operational/project-lifecycle).

## 9. Backup plan

If OWASP declines or the timeline slips beyond Q1 2027, Interlace operates the same benchmark as the **ILB Public Leaderboard** (Phase 3.1 — see [`2026-05-09-ilb-submission-protocol.md`](./2026-05-09-ilb-submission-protocol.md)). The methodology is identical; only the operating org differs. OWASP partnership amplifies credibility but isn't a blocker.

---

## Appendix A — Corpus expansion plan

From the existing 80 fixtures across 6 CWEs to ~200 across ~12 CWEs over 90 days:

| CWE | Today | Target | Notes |
| :--- | :---: | :---: | :--- |
| CWE-022 (Path Traversal) | ~12 | 25 | Add SSRF-adjacent variants |
| CWE-078 (OS Command Injection) | ~10 | 25 | Add Lambda / serverless variants |
| CWE-079 (XSS) | ~14 | 30 | Add framework-specific (React, Vue) |
| CWE-089 (SQL Injection) | ~14 | 30 | Add ORM-specific (Sequelize, Prisma, Drizzle) |
| CWE-094 (Code Injection) | 0 | 15 | New |
| CWE-352 (CSRF) | 0 | 10 | New |
| CWE-502 (Deserialization) | 0 | 15 | New |
| CWE-798 (Hardcoded Credentials) | ~10 | 20 | Add modern .env / secret-manager patterns |
| CWE-915 (Object Injection) | 0 | 10 | New |
| CWE-918 (SSRF) | ~14 | 20 | Already strong |
| CWE-943 (NoSQL Injection) | 0 | 15 | New, Mongoose / MongoDB-driver focused |
| **Total** | **~74** | **~215** | |

Each fixture peer-reviewed (second-rater per principle #5) before landing.

## Appendix B — Existing infrastructure links

Everything in this proposal is already in production. Reviewers can verify by cloning the repo and running:

```bash
git clone https://github.com/ofri-peretz/eslint
cd eslint && npm install
npm run ilb:juliet         # ~30 sec, runs the existing CWE corpus + computes BAS
npm run ilb:diff           # diff matrix vs CodeQL/Semgrep/Snyk where installed
npm run ilb:scorecard      # cross-bench rollup
```
