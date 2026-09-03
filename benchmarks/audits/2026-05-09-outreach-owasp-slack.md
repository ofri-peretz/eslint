# OWASP Slack — Outreach Draft (Tier 4.J)

> **Channel.** OWASP Foundation Slack `#project-benchmark` (or `#projects-general` if the former is invite-only).
> **Sender.** Project maintainer.
> **Goal.** A 30-min call with the OWASP Benchmark Project lead within 14 days.
> **Backstop if no reply.** Email the project lead directly using the same content; CC OWASP Foundation `projects@owasp.org`.

---

## Slack post (target: <500 words, embed live links)

> 👋 Hi everyone — sharing a project I'd like the OWASP Benchmark Project's feedback on.
>
> **TL;DR.** I've built **Interlace Lint Bench (ILB)** — a public, reproducible JS/TS static-analysis benchmark structured to mirror the OWASP Benchmark Project's BAS scoring formula and truth-table format, but for JavaScript. I'd like to propose contributing it as **OWASP Benchmark for JavaScript** under OWASP project governance.
>
> The corpus + scoring infrastructure is already in production today. Quick demo:
>
> ```bash
> git clone https://github.com/ofri-peretz/eslint && cd eslint && npm install
> npm run ilb:juliet         # ~30 sec — runs the existing CWE corpus, computes BAS per CWE
> npm run ilb:diff           # diff matrix vs CodeQL / Semgrep / Snyk Code (where installed)
> ```
>
> What I'd contribute (full pitch in the [project proposal doc](https://github.com/ofri-peretz/eslint/blob/main/benchmarks/audits/2026-05-09-owasp-benchmark-pitch.md)):
>
> - **The existing seed corpus** — ~80 fixtures across CWE-022, -078, -079, -089, -798, -918. Expansion plan to ~215 fixtures across 12 CWEs over 90 days.
> - **Scoring formula identical to OWASP Benchmark v1.2** — BAS (Youden's J, TPR − FPR), per-CWE + aggregate. Same `expectedresults-1.2.csv`-style truth table.
> - **Per-tool runners** — adapters for Interlace, CodeQL, Semgrep, Snyk Code already shipped. Becomes the basis for tool-vendor self-attestation under OWASP governance.
> - **Reproducibility infrastructure** — pre-registration via `methodologyCommit`, append-only `history.ndjson`, Cohen's κ inter-rater tooling.
> - **Operating support** — willing to handle PR triage / CI / corpus expansion under OWASP governance for the first 24 months. Long-term governance belongs to OWASP.
>
> What I'd ask of OWASP:
>
> 1. **Project recognition** — either a sub-project under OWASP Benchmark or a fresh OWASP Lab project with a path to Production status.
> 2. **Repo hosting** — `OWASP/benchmark-javascript` or similar.
> 3. **Project lead approval + a 30-min call** to walk through the existing infrastructure.
>
> **Why now**: The Java OWASP Benchmark has 5+ years of "when JS?" requests. JS/TS is the largest production codebase footprint in 2026. Tool vendors that don't currently submit to OWASP Benchmark (Snyk, Semgrep — both JS-first) gain a public leaderboard to compete on. The ILB infrastructure is open-source, GitHub-Actions-hosted (zero infrastructure spend on OWASP).
>
> Anyone available for a short walk-through this/next week? Happy to coordinate over DM.
>
> Full proposal + demo links: [pitch packet](https://github.com/ofri-peretz/eslint/blob/main/benchmarks/audits/2026-05-09-owasp-benchmark-pitch.md) · [submission protocol](https://github.com/ofri-peretz/eslint/blob/main/benchmarks/audits/2026-05-09-ilb-submission-protocol.md) · [bench README](https://github.com/ofri-peretz/eslint/blob/main/benchmarks/README.md)

---

## Email fallback

If no Slack reply within 5 days, send the same content via email to:

- **Project lead** — the current chair listed on https://owasp.org/www-project-benchmark/ (verify the contact at send-time; it rotates)
- **CC** — `projects@owasp.org` (OWASP Foundation projects coordination)

Subject line: `OWASP Benchmark for JavaScript — proposal`.

## Talking points for the call (when scheduled)

1. **Demo first** (5 min) — `npm run ilb:juliet`, show BAS per-CWE output; `npm run ilb:diff`, show the agreement matrix.
2. **Governance model** (5 min) — Year 1 Interlace operates; Year 2+ OWASP-controlled steering committee. The 3-steward voting model is documented in [`benchmarks/audits/2026-05-09-corpus-governance.md`](./2026-05-09-corpus-governance.md).
3. **Path to OWASP Production status** (5 min) — start as Lab → meet 12-month operating-track-record requirement → promote.
4. **Timeline** (5 min) — 8-week onboarding per the pitch packet's outreach plan.
5. **Open questions** (5 min):
   - Sub-project under OWASP Benchmark or fresh Lab project?
   - Truth-table format compatibility (we mirror v1.2 exactly — confirm acceptable).
   - Vendor-attestation flow for the differential bench results.

## Success criteria

- ✅ A reply within 14 days.
- ✅ A scheduled call within 21 days.
- ✅ Either: (a) Lab project application started, or (b) sub-project recognition agreed.

If after 30 days no traction: pivot to direct vendor outreach (Snyk Research, Semgrep Research) for community-style co-publication, and operate the leaderboard standalone via `bench.interlace.dev`. Per the pitch packet, OWASP partnership amplifies credibility but isn't a blocker.
