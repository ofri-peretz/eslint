# External Replication Kit

> **Roadmap.** [LEADERSHIP_ROADMAP.md](../LEADERSHIP_ROADMAP.md) §4.3.
> **Audience.** Independent auditors, academic security labs, security consultancies, third-party reviewers.
> **Status (2026-05-09).** Kit + comparison tooling ready. Funding / engaging the third party is the only external action.

This document is what an external party needs to **independently re-run** the Interlace bench corpus and publish results that we then compare against ours via Cohen's κ. Used to satisfy roadmap items 4.3 (External replication) and 4.4 (Cohen's κ inter-rater agreement).

## Why externally replicate

A claim like "Interlace beats sonarjs at F1 98.8% vs 47.5%" has zero credibility when the same party runs the bench *and* publishes the result. External replication is the academic / regulatory standard:

- Required by every peer-reviewed security paper (NSDI, USENIX Security, S&P).
- Required by NIST SP 800-218 SSDF practice PW.6 ("review human-readable code").
- Required by the [ACM Reproducibility Initiative](https://www.acm.org/publications/policies/artifact-review-and-badging-current).

## Candidate reviewers

These groups have run independent SAST evaluations before and would be credible third parties:

| Type | Examples | Likely fit |
| :--- | :--- | :--- |
| **Academic security labs** | UC Berkeley DeepSpec · MIT CSAIL · CMU CyLab · TU Delft Software Engineering · KU Leuven DistriNet | Best fit — public methodology, peer-reviewed reputation, accustomed to bench evaluations |
| **Security consultancies** | Trail of Bits · NCC Group · Doyensec · Secure Code Warrior | Faster turnaround, paid engagement, less academic friction |
| **Government / standards bodies** | NIST SARD team · MITRE Engenuity | Highest credibility, longest engagement window |
| **Independent contributors** | Snyk Research · GitHub Security Lab · Semgrep Research | Already maintain SAST corpora; alignment is mutual |

Top three to approach in order: NCC Group (commercial, fast, has a JS practice) → CMU CyLab (academic, deep, slower) → MITRE (longest, most formal).

## Reproducibility kit (what we ship to the reviewer)

Everything they need lives in this repo. Send them this list:

```bash
# 1. Clone + install
git clone https://github.com/ofri-peretz/eslint
cd eslint
npm install   # ~3 min

# 2. Pin to the methodology commit they're scoring against
git checkout <SHA from envelope.methodologyCommit>

# 3. Run the bench corpora
npm run ilb:juliet         # ~30 sec — synthetic CWE corpus
npm run ilb:arena          # ~2 min — 18-plugin head-to-head
npm run ilb:wild           # ~30 min cold — 22 OSS repos, 1.7M LoC

# 4. Verify the toolchain block recorded in their result matches the
#    one we published. Mismatches are real findings — they prove the
#    bench's portability claims.
cat benchmarks/results/ilb-arena/<date>.json | jq '.toolchain'
```

Deliverables we ask for in return:

1. **A SARIF file** — `external-reviewer.sarif` covering the same fixtures as our published run.
2. **A toolchain block** — the same shape we use, so we can compare parity.
3. **A short methodology note** — what version of Node / ESLint / TS / OS they used; any deviations from the recipe.
4. **A waiver / publication agreement** — the reviewer agrees we can publish their numbers alongside ours, citing them by name + affiliation.

## Comparison tooling (what we run when the SARIF lands)

Once the reviewer's SARIF is in `benchmarks/external-reviews/<reviewer-id>/<date>/result.sarif`, we run:

```bash
# Cohen's κ between Interlace's SARIF and the reviewer's SARIF
node scripts/ilb-kappa.mjs \
  --a benchmarks/results/ilb-arena/<date>.sarif \
  --b benchmarks/external-reviews/<reviewer-id>/<date>/result.sarif \
  --out benchmark-results/external-replication-<reviewer-id>
```

Output: `benchmark-results/external-replication-<reviewer-id>.{json,md}` — confusion matrix + κ statistic + Landis-Koch interpretation.

**SLO**: κ ≥ 0.75 (substantial agreement) per the roadmap. Below that, we publish the disagreement region as a triage backlog rather than a victory headline.

## Engagement template (what we send to the reviewer)

```
Subject: Independent re-run of the Interlace ESLint Benchmark

Hi <name>,

We're publishing public benchmark numbers for the Interlace ESLint
ecosystem (https://github.com/ofri-peretz/eslint) and looking for an
independent reviewer to re-run the corpus and publish results
alongside ours. The full reproducibility kit is at
benchmarks/audits/2026-05-09-external-replication-kit.md.

Effort: ~2 days end-to-end. We'd cite you (or your team) by name +
affiliation on the leaderboard and in any conference talk that
references the numbers. We'd also fund travel / honorarium per your
group's standard rate if relevant.

Interested? Available on a 30-min call to walk through the methodology.

— <signature>
```

## Risks + mitigations

| Risk | Mitigation |
| :--- | :--- |
| Reviewer's environment differs subtly (Node patch, OS, locale) → spurious drift | Toolchain block is recorded in their SARIF; we compare and account for known compiler differences (see ILB-TSC-Matrix). |
| Reviewer publishes before we coordinate the framing | Waiver / publication agreement at engagement time. |
| Reviewer finds genuine bugs we don't have | Best outcome — file in `FP_FN_REMEDIATION_TRACKER.md`, fix, re-run. Public credibility beats embarrassment-avoidance. |
| Cost / timeline overrun | Cap at $5K and 6 weeks; if not viable, fall back to a peer SAST-tool author (Semgrep Research) for a community-style replication. |

## Status

- [x] Reproducibility kit documented (this file)
- [x] κ comparison tooling shipped (`scripts/ilb-kappa.mjs` + `benchmarks/lib/stats-kappa.mjs`)
- [ ] Initial outreach email sent (next external action)
- [ ] Reviewer engaged + SARIF received
- [ ] κ computed + published

When the SARIF arrives, run the comparison and update [LEADERSHIP_ROADMAP.md](../LEADERSHIP_ROADMAP.md) §4.3 + §4.4.
