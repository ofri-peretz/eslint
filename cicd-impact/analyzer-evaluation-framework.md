# Evaluate any static code analyzer — a vendor-neutral scorecard

> **Read [`value-philosophy.md`](value-philosophy.md) and [`philosophy.md`](philosophy.md) first.** This document is the operationalisation of the "What 'high-end' means" subsection in `philosophy.md` — a reusable scorecard a buyer applies to **any** static analyzer (SonarQube, Snyk, CodeQL, Semgrep, ESLint, the plugin monorepo this folder ships with, internal tooling, anything) to decide whether it meets the high-end bar and how it ranks against alternatives.
>
> **Why this exists separately.** A philosophy authored by a vendor is structurally conflicted (Attack 7 in [`value-philosophy.md`](value-philosophy.md) §6.5). The conflict is mitigated only if the framework the vendor uses to argue for itself is the same framework the buyer can use to evaluate the vendor *against the alternatives*. This document is that framework, vendor-neutral, with the explicit invitation to score `@interlace/eslint-plugin-*` (the monorepo this folder lives in) using it. If our scores don't beat the alternatives on the dimensions the buyer cares about, the buyer should pick the alternative — that is the discipline this document enforces on us.

## The scorecard at a glance

A high-end analyzer must score adequately on **six dimensions**. The dimensions are not interchangeable: a top score on five and a failure on one is usually worse than a uniform score across all six, because a single dimension failure is usually disqualifying (a 30-second linter cannot live in the editor loop regardless of its precision).

| Dimension | What it measures | High-end bar | Disqualifying floor |
| :--- | :--- | :--- | :--- |
| **1. Precision (TP rate)** | Of warnings raised, what fraction are real? | ≥ 95% on the analyzer's claimed rule scope | < 80% (alert fatigue → effective recall drops to 0) |
| **2. Recall** | Of real issues in scope, what fraction does the analyzer flag? | ≥ 90% on a relevant CWE / OWASP / domain corpus | < 70% (cannot be sole defensive layer) |
| **3. Inner-loop latency** | Time per file in editor; time for full repo pre-commit | < 1 s per file editor; < 30 s pre-commit full repo | > 5 s per file (demoted to CI; loses 100× leverage) |
| **4. Ecosystem coverage** | Languages, frameworks, edge cases the analyzer handles | Primary stack + at least one adjacent edge case (e.g. TS + React + Node) | Single-language-only with no framework awareness |
| **5. Active maintenance** | Release cadence, security responsiveness | Monthly releases; security advisories addressed within days | Last release > 12 months ago |
| **6. Public benchmark posture** | Reproducible precision/recall, honest losses preserved | Public benchmark suite; honest losses documented | No public benchmark, marketing claims only |

A passing analyzer hits **all six** thresholds. An analyzer that fails any one disqualifying floor is not high-end regardless of its scores elsewhere.

## How to score an analyzer (the operational protocol)

### Dimension 1 — Precision

**Method.** Run the analyzer against a corpus that mixes seeded vulnerabilities and clean code. For each warning, classify TP (real issue) or FP (false alarm). Report `precision = TP / (TP + FP)`.

**Corpus options:**

- **NIST SARD / Juliet Test Suite** — the gold standard for security rules. [Free download](https://samate.nist.gov/SARD/).
- **OWASP Benchmark v1.2** — Java-specific but methodology generalisable. [GitHub](https://owasp.org/www-project-benchmark/).
- **Open-source codebases of moderate maturity** (e.g. shadcn-ui, axios, lodash) — provides realistic FP rate against quality real-world code.
- **Your own codebase** — most relevant; gives the FP rate the analyzer will actually produce in your specific context.

**Bar.** ≥ 95% precision against the corpus the analyzer claims to cover. Below 80% triggers alert fatigue and developers will suppress all warnings; the analyzer's effective recall collapses regardless of its on-paper recall.

**What to watch for.** Analyzers that score well on Juliet (synthetic) and poorly on real codebases — common pattern, indicates training-set overfit. Always score against at least one real-world repo.

### Dimension 2 — Recall

**Method.** Same corpus as precision, but compute `recall = TP / (TP + FN)`. The denominator (FN: false negatives) is what the analyzer should have caught but didn't; you need ground-truth annotations to compute it.

**Corpus options:** same as above; NIST SARD / Juliet has ground-truth labels per CWE.

**Bar.** ≥ 90% on a relevant CWE or OWASP corpus. Below 70%, the analyzer cannot be the sole defensive layer for the rule classes it claims to cover; you need a second analyzer or layer.

**What to watch for.** Analyzers that game recall by being noisy (high TP rate but also high FP rate). Always score precision and recall together; the F1 score (harmonic mean) is a useful summary but **don't average them blindly** — the disqualifying floor on precision is harder than the equivalent on recall, because alert fatigue is asymmetric.

### Dimension 3 — Inner-loop latency

**Method.** Three measurements:

- **Editor-loop latency:** time to lint one file on save / on type. Run inside the IDE the analyzer claims to support. Report median over 100 saves.
- **Pre-commit-loop latency:** time to lint the entire repo from a clean cache. Report median over 5 runs.
- **CI-loop latency:** time as part of the CI pipeline. Report mean over a calendar week of real CI runs.

**Bar.** < 1 s per file in the editor; < 30 s for full pre-commit on a representative repo (e.g. 1,000–5,000 source files). > 5 s per file in editor demotes the analyzer to pre-commit; > 60 s pre-commit demotes it to CI. Each demotion loses ~100× leverage per the feedback-loop hierarchy in [`philosophy.md`](philosophy.md).

**What to watch for.** Analyzers benchmarked only on small repos (< 100 files) often degrade non-linearly on larger codebases. Always test on a real repo of your scale.

### Dimension 4 — Ecosystem coverage

**Method.** Verify support for:

- Primary language(s) used by your org
- Major frameworks (React, Next.js, Vue, Express, NestJS, etc.)
- TypeScript (if applicable)
- The analyzer's behaviour on at least one adjacent edge case (mixed JS/TS monorepo, Vite + React Native, server actions, etc.)

**Bar.** Primary stack + at least one adjacent edge case demonstrably handled. Single-language-only analyzers in modern ecosystems are disqualifying for monorepo-scale orgs.

**What to watch for.** Analyzers that claim "JavaScript" but break on TypeScript syntax, or claim "React" but miss server-component patterns. Always run the analyzer on a current-version sample of your real stack.

### Dimension 5 — Active maintenance

**Method.** Check:

- Latest release date (npm, PyPI, GitHub Releases — wherever the analyzer ships)
- Time-to-respond on the last 5 security advisories or critical bug reports
- Open-issue / closed-issue ratio over the last 12 months
- Whether the analyzer still receives commits from at least 2 different contributors

**Bar.** Monthly release cadence at minimum; security advisories addressed within days. Last release > 12 months ago is disqualifying — the analyzer will silently degrade as the ecosystem evolves around it.

**What to watch for.** "Stable" analyzers that haven't shipped in 18 months. Stable in software-tooling context means *kept current*, not *unchanged*.

### Dimension 6 — Public benchmark posture

**Method.** Check:

- Does the analyzer publish a precision/recall benchmark anyone can reproduce?
- Are the benchmark fixtures available?
- Are honest losses (places where the analyzer loses to competitors) documented publicly?
- Are claims tied to specific evidence files with "last verified" dates?

**Bar.** All four "yes". The honest-losses requirement is the strongest signal — analyzers that publish only their wins are doing marketing; analyzers that publish their losses are operating under a measurement discipline.

**What to watch for.** Vendors that cite synthetic benchmarks but won't release the corpus. Vendors that cite "1st place" without naming the field. Vendors whose precision/recall claims have no "last verified" date.

## Composite scoring

A high-end analyzer must hit the high-end bar on **all six** dimensions. There is no compensation across dimensions — a 100% precision analyzer that takes 30 seconds per file is not high-end, because it's been demoted out of the inner loop.

A simple weighted score for cross-vendor comparison (used only after disqualifying-floor screening):

```text
composite = 0.25 × precision_score
          + 0.20 × recall_score
          + 0.20 × latency_score
          + 0.15 × ecosystem_score
          + 0.10 × maintenance_score
          + 0.10 × benchmark_posture_score
```

Where each `*_score` is 0–100. The weights reflect that precision and latency are the most disqualification-prone (heaviest weight), while maintenance and benchmark posture are necessary but not sufficient (lighter weight).

## Vendors to score

Use this scorecard against the analyzers commonly shortlisted for JavaScript / TypeScript engineering orgs:

| Vendor | Category | Scope |
| :--- | :--- | :--- |
| [SonarQube / SonarCloud](https://www.sonarsource.com/) | General-purpose static analysis | Multi-language; cloud + on-prem |
| [Semgrep](https://semgrep.dev/) | Pattern-based + dataflow analysis | Multi-language; CLI + cloud |
| [Snyk Code](https://snyk.io/product/snyk-code/) | DeepCode-derived AI-assisted SAST | Multi-language; cloud-first |
| [GitHub CodeQL](https://codeql.github.com/) | Query-based semantic analysis | Multi-language; integrated with GitHub Actions |
| [ESLint core](https://eslint.org/) + popular plugins | Rule-based JS/TS linting | JavaScript / TypeScript ecosystem |
| `@interlace/eslint-plugin-*` (this monorepo) | Specialised security + quality rule packs | JavaScript / TypeScript ecosystem; this folder's reference customer |
| [eslint-plugin-security](https://github.com/eslint-community/eslint-plugin-security) | Generic security rules | JavaScript |
| [Biome](https://biomejs.dev/) | Rust-based ESLint alternative | JavaScript / TypeScript |

The discipline: score them all, on the same corpus, with the same protocol. The buyer's decision should fall out of the scores. If `@interlace/eslint-plugin-*` doesn't beat the alternatives on the dimensions the buyer cares about, the buyer should pick the alternative — and we should fix our weakness.

## Honest disclosure

This document is published in the same monorepo as `@interlace/eslint-plugin-*`. We make our case for the monorepo's quality not by claiming the framework was authored neutrally, but by:

1. Making the framework reusable for evaluating the alternatives (this document)
2. Publishing our own scores against this framework in [`benchmarks/`](../benchmarks/) and [`CLAIMS.md`](../CLAIMS.md)
3. Preserving honest losses — places where competitors beat us — in [`CLAIMS.md`](../CLAIMS.md) under "Honest losses (preserved)"
4. Inviting the buyer to score competitors using the same protocol; if a competitor scores higher, that is the answer

This is the only structural answer to vendor-conflict skepticism that doesn't require trusting the vendor. The buyer trusts the *protocol*, runs it themselves, and lets the numbers decide.

## Source list

This document's methodology is consistent with:

- [`philosophy.md`](philosophy.md) §"What 'high-end' static code analysis means" — the original threshold definitions.
- [`value-philosophy.md`](value-philosophy.md) §6.5 Attack 7 — the structural argument for vendor-neutral evaluation.
- [NIST SARD / Juliet Test Suite](https://samate.nist.gov/SARD/) — corpus standard for security-rule precision/recall.
- [OWASP Benchmark v1.2](https://owasp.org/www-project-benchmark/) — methodology for static-analyzer evaluation.
- [`benchmarks/README.md`](../benchmarks/README.md) — the monorepo's specific application of this framework.
