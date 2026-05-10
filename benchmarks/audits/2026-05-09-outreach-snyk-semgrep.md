# Snyk Research / Semgrep Research — Differential Co-Publication Outreach (Tier 4.K)

> **Targets.** Snyk Research team · Semgrep Research team · GitHub Security Lab.
> **Goal.** A friendly differential publication: each tool runs the ILB corpus on shared JS/TS code, results published side-by-side, narrative emphasizes **the disagreement region** (where tools diverge is the interesting signal — not "we win").
> **Strategic value.** Their endorsement = 50× the credibility of running our own bench. Differential infra (`ilb:diff`) already exists.

---

## Why each target is a fit

| Target | Why fit | Friction |
| :--- | :--- | :--- |
| **Snyk Research** | JS-first, publishes annual "State of OSS Security" benchmarks. Already running large-scale SAST analysis. Engaged in OWASP standards work. | Commercial product team may filter "give us numbers" requests; pitch as research collaboration, not eval. |
| **Semgrep Research** | Open-source-first culture; runs public research blog. Has historically engaged with academic SAST evals. Direct technical compatibility (both AST-based). | Their flagship is broader (multi-language); JS-only positioning may not align with their primary push. |
| **GitHub Security Lab** | Operates CodeQL. Engaged in CWE / OpenSSF / SAST standards. Publishes research at blackhat / academic venues. | Highest credibility, slowest cycle. Worth as the third pitch even if response window is months. |

**Order of approach:** Semgrep first (lowest friction, highest cultural alignment) → Snyk second → GitHub Security Lab third.

---

## Email template (adapt per recipient)

> Subject: Friendly differential benchmark — `[their tool]` × Interlace × CodeQL on shared JS/TS corpus
>
> Hi `[research lead first name]`,
>
> I'm `[name]`, maintainer of the Interlace ESLint ecosystem (https://github.com/ofri-peretz/eslint). I've been working on a public, reproducible benchmark for JS/TS static analysis — full disclosure: it ran *our own* tool first to validate the methodology. Now I want to run *yours*.
>
> Specifically: **a friendly differential publication, structured around the disagreement region.** I run `[their tool]` on the same fixtures Interlace runs on, publish the results side-by-side, and the headline narrative is *where we disagree* — not "we win." That's the interesting signal for the JS/TS SAST community: what does each tool catch that the others miss?
>
> The framework is already in place. From the repo:
>
> ```bash
> git clone https://github.com/ofri-peretz/eslint && cd eslint && npm install
> npm run ilb:diff -- --tools `[their tool name]`
> ```
>
> Output: a SARIF-normalized agreement matrix. Same scoring formula for everyone. Reproducibility kit + Cohen's κ comparison tooling at [`benchmarks/audits/2026-05-09-external-replication-kit.md`](https://github.com/ofri-peretz/eslint/blob/main/benchmarks/audits/2026-05-09-external-replication-kit.md).
>
> What I'd ask of `[their tool]`:
>
> 1. **A short call** (30 min) to walk through the methodology + agree on what's published.
> 2. **A SARIF run** of `[their tool]` on the Interlace bench corpus. (We can host the run on our CI runner — we just need a license / OSS-license-compatible setup.)
> 3. **Joint co-author credit** on the resulting publication.
>
> What you'd get:
>
> - **Public attribution** as a co-publisher on a benchmark the JS/TS SAST community can compare against.
> - **The disagreement-region findings** — concrete cases where `[their tool]` flags something Interlace misses (or vice versa). Useful for both teams' rule-quality work.
> - **No comparative loser narrative.** The bench publishes the agreement matrix; "we win" framings are explicitly disallowed by the methodology (single-dimension single-number rule, principle #4).
>
> Available for a 30-min call any time over the next 2 weeks. Happy to drive the scheduling.
>
> Thanks,
> `[name]`
>
> --
> Bench README: https://github.com/ofri-peretz/eslint/blob/main/benchmarks/README.md
> Pitch packet (we're also approaching OWASP for project recognition): https://github.com/ofri-peretz/eslint/blob/main/benchmarks/audits/2026-05-09-owasp-benchmark-pitch.md

---

## Per-target specifics

### Semgrep Research

- **Likely contact**: research@semgrep.com or the public researcher list on their blog.
- **Differentiator to emphasize**: shared open-source + AST-based commitments. Both teams benefit from a public diff against CodeQL.
- **Technical hook**: Interlace already has a Semgrep adapter at `benchmarks/suites/ilb-diff/run.mjs` — running `semgrep --config p/javascript --config p/typescript` on the fixture corpus is a one-command operation.

### Snyk Research

- **Likely contact**: research@snyk.io or via their open-source program.
- **Differentiator to emphasize**: their "State of OSS Security" annual report could cite ILB numbers as third-party validation. Mutual credibility.
- **Technical hook**: Snyk Code adapter is at `benchmarks/suites/ilb-diff/run.mjs`. Their CLI accepts a directory + emits SARIF; integration is trivial.

### GitHub Security Lab

- **Likely contact**: securitylab@github.com or via the [GitHub Security Lab repo](https://github.com/github/securitylab).
- **Differentiator to emphasize**: GitHub already runs CodeQL on millions of repos; ILB gives them a benchmark to publish their JS coverage against in a head-to-head format.
- **Technical hook**: CodeQL adapter is at `benchmarks/suites/ilb-diff/run.mjs`. CodeQL needs a database build (heavy), but can run on a CI runner with `codeql database create`.

---

## Backstop (if all three decline or stall)

Operate the differential bench solo per the [submission protocol](./2026-05-09-ilb-submission-protocol.md). The framework accepts SARIF submissions from any tool — even without endorsement, third parties can submit, and the agreement matrix builds itself over time.

The first commercial-tool submission (any of the three above, or any vendor) lands as a row on the [public leaderboard](../../benchmark-results/leaderboard.md) without any further coordination required.

---

## Success criteria

- ✅ At least 1 reply within 14 days from any of the three targets.
- ✅ At least 1 SARIF run of a peer tool on the ILB corpus within 30 days.
- ✅ A jointly-authored differential publication blog post within 90 days.
