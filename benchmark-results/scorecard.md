# Interlace Bench Scorecard

> Generated: 2026-05-11 · Methodology: [`benchmarks/README.md`](benchmarks/README.md)

## Top-line scorecard

| Bench | Dimension | Score | Trend | Detail | SLO | As of |
|---|---|---|---|---|---|---|
| **ILB-Juliet** | Synthetic CWE accuracy | **F1 100% (rank 1/6)** | `▁▁` | TP 13 · FP 0 · FN 0 · BAS 100% · 6 CWEs | F1 ≥ 80% | 2026-05-03 |
| **ILB-Arena** | Head-to-head vs competitors | **F1 97.5% (rank 1/18)** | `▁▁` | TP 40/40 · FP 2 · FN 0 · precision 95.2% · recall 100.0% | Rank ≤ 3 | 2026-05-11 |
| **ILB-Wild** | Findings on popular OSS | **3.48 findings/kLoC** | `▁▁` | 1,824,028 LoC across 22/22 repos | — | 2026-05-03 |
| **ILB-Edge** | FP resilience on adversarial-real code | **3837 FP candidates** | `▁▁` | 5 adversarial-real repos · 361,376 LoC · awaiting triage | FP rate ≤ 2% | 2026-05-03 |
| **ILB-Perf** | Lint throughput | **5.4 ms/file (median)** | `▁▁` | peak RSS 670MB across 22 repos · cold scenario | ≤ 15 ms/file | 2026-05-03 |
| **ILB-Cov** | Rule activation rate | **19% rules fired** | `▁▁` | 39/208 rules across 11 plugins on Wild corpus | ≥ 70% | 2026-05-03 |
| **ILB-AI** | Vuln detection on LLM-generated code | **68% detection** | `▁▁` | 13/19 LLM-generated functions flagged across 1 model | — | 2026-02-09 |
| **ILB-LLM-Tokens** | Formatter token cost | **sec/compact -8.7% vs V1** | `▁▁` | compact: sec -8.7% · qual +6.8% · perf +102.7% · 48 measurements · methodology v1.0 | sec/compact ≤ V1 | 2026-05-03 |
| **ILB-LLM-Fix** | First-fix accuracy on LLM-consumed lint output | **97.22% macro pass** | `▁▁` | v1=91.67% · v2-human=100% · v2-agent=100% · models opus · spent $5.1140 · methodology v1.3 | ≥ 80% macro pass | 2026-05-03 |

The **Trend** column shows the last ≤ 12 recorded scores per bench (one per recording day). `▁` = lowest in window, `█` = highest. Source: [`benchmark-results/history.ndjson`](history.ndjson).

## How to read this

- **Score** is the single comparable number for each bench.
- **SLO** is the target we want to hit; the CI gate fails if a bench regresses below it.
- **As of** is the date of the underlying result file. Stale dates (>30 days) mean the bench should be re-run.
- Where score = "—", the bench has not been generated yet against the current methodology version.

## Industry parallels

| Bench | Parallel |
|---|---|
| ILB-Juliet | NIST SARD / Juliet Test Suite, OWASP Benchmark v1.2 |
| ILB-Arena | OWASP Benchmark Accuracy Score (BAS = TPR − FPR) |
| ILB-Wild | (none — we define the JS standard) |
| ILB-Edge | Adversarial GLUE / CheckList |
| ILB-Perf | MLPerf Inference, SPEC CPU |
| ILB-Cov | (analogous to mutation testing coverage) |
| ILB-AI | HumanEval / SWE-Bench (task design); WMDP (security framing) |
| ILB-LLM-Tokens | (we define this — `tiktoken` reproducibility benchmarks closest) |
| ILB-LLM-Fix | HumanEval / SWE-Bench (task design only) |


## ILB-Wild drilldown (2026-05-03)

### Per-repo

| Repo | Status | LoC | Files | Findings | /kLoC |
|---|---|---|---|---|---|
| three.js 🔬 | ✅ | 175,430 | 727 | 1932 | 11.01 |
| shadcn-ui | ✅ | 22,551 | 117 | 2 | 0.09 |
| sst | ✅ | 66,791 | 194 | 0 | 0 |
| nestjs | ✅ | 42,142 | 596 | 0 | 0 |
| vercel-ai | ✅ | 152,090 | 1431 | 5 | 0.03 |
| react 🔬 | ✅ | 4,539 | 37 | 0 | 0 |
| webpack 🔬 | ✅ | 156,040 | 581 | 1847 | 11.84 |
| lodash 🔬 | ✅ | 951 | 4 | 58 | 60.99 |
| babel 🔬 | ✅ | 24,416 | 41 | 0 | 0 |
| serverless | ✅ | 128,881 | 609 | 2399 | 18.61 |
| aws-lambda-powertools | ✅ | 40,704 | 260 | 5 | 0.12 |
| nestjs-typeorm | ✅ | 803 | 16 | 0 | 0 |
| twentyhq | ✅ | 411,003 | 4978 | 29 | 0.07 |
| langchain-js | ✅ | 47,922 | 243 | 2 | 0.04 |
| payload | ✅ | 65,381 | 626 | 0 | 0 |
| supabase | ✅ | 295,982 | 2042 | 12 | 0.04 |
| appwrite | ✅ | 4,080 | 15 | 0 | 0 |
| strapi | ✅ | 7,342 | 77 | 0 | 0 |
| cal.com | ✅ | 10,235 | 196 | 15 | 1.47 |
| medusa | ✅ | 40,632 | 709 | 2 | 0.05 |
| serverless-api-gateway-caching | ✅ | 802 | 6 | 32 | 39.9 |
| next.js | ✅ | 125,311 | 918 | 3 | 0.02 |

🔬 = ILB-Edge target (findings = FP candidates)

### Plugin activation across the corpus

| Plugin | Rules fired | Activation | Repos exercising |
|---|---|---|---|
| secure-coding | 16 / 28 | 57.1% | 21 |
| lambda-security | 6 / 14 | 42.9% | 4 |
| node-security | 11 / 33 | 33.3% | 20 |
| nestjs-security | 1 / 6 | 16.7% | 3 |
| browser-security | 4 / 45 | 8.9% | 6 |
| vercel-ai-security | 1 / 19 | 5.3% | 2 |
| pg | 0 / 13 | 0% | 4 |
| express-security | 0 / 10 | 0% | 4 |
| mongodb-security | 0 / 16 | 0% | 1 |
| jwt | 0 / 13 | 0% | 1 |
| crypto | 0 / 11 | 0% | 1 |


## Per-rule observability (Gap G + Gap L)

> Aggregated from `benchmark-results/<latest>/per-repo/*/per-rule.json`. The **Measured** column shows where this rule has fixture coverage: `A` = appears in ILB-Arena results, `J` = appears in ILB-Juliet results, `⚠️ none` = the rule fires on real OSS but has no synthetic-bench coverage (we have no precision/recall data for it).

### Top 15 most-firing rules across the Wild corpus

| Rule | Wild hits | Avg ms / hit | Repos | Severity (E/W) | Measured |
|---|---:|---:|---:|---|---|
| `secure-coding/detect-object-injection` | 3,484 | 25.4 | 19 | 0E / 28W | A |
| `secure-coding/no-hardcoded-credentials` | 646 | 14.34 | 19 | 34E / 0W | AJ |
| `secure-coding/no-insecure-comparison` | 623 | 12.47 | 19 | 0E / 21W | A |
| `secure-coding/no-unlimited-resource-allocation` | 474 | 30.84 | 19 | 7E / 0W | A |
| `secure-coding/no-unchecked-loop-condition` | 239 | 31.94 | 19 | 6E / 0W | ⚠️ none |
| `secure-coding/no-unsafe-deserialization` | 148 | 14.26 | 19 | 3E / 0W | A |
| `node-security/no-buffer-overread` | 136 | 26.97 | 18 | 4E / 0W | ⚠️ none |
| `node-security/detect-non-literal-fs-filename` | 84 | 4.99 | 18 | 1E / 0W | AJ |
| `secure-coding/no-graphql-injection` | 56 | 32.73 | 19 | 6E / 0W | ⚠️ none |
| `node-security/lock-file` | 48 | 33.96 | 18 | 1E / 0W | ⚠️ none |
| `secure-coding/detect-non-literal-regexp` | 47 | 6.39 | 19 | 0E / 1W | A |
| `node-security/no-arbitrary-file-access` | 47 | 4.1 | 18 | 1E / 0W | A |
| `secure-coding/no-redos-vulnerable-regex` | 46 | 6.69 | 19 | 1E / 0W | A |
| `secure-coding/no-unsafe-regex-construction` | 38 | 3.84 | 19 | — | A |
| `lambda-security/no-overly-permissive-iam-policy` | 27 | 4.42 | 4 | — | ⚠️ none |

### Unmeasured rules — fire on Wild but no fixture coverage (≥ 50 hits)

⚠️ 3 rule(s) firing on real OSS without synthetic-bench coverage. Add fixtures to bring these under measurement.

| Rule | Wild hits | Repos | Avg ms / hit |
|---|---:|---:|---:|
| `secure-coding/no-unchecked-loop-condition` | 239 | 19 | 31.94 ms |
| `node-security/no-buffer-overread` | 136 | 18 | 26.97 ms |
| `secure-coding/no-graphql-injection` | 56 | 19 | 32.73 ms |


## Trust signals — inter-rater agreement, over-fit, corpus breadth

> Generated by `npm run ilb:coverage` (reads `benchmark-results/coverage.json`).
> Closes the OWASP-Benchmark-style trust gap: three orthogonal validation signals that don't depend on labels alone.

### Inter-rater agreement (OWASP-style)

For each fixture, count how many tools' verdicts match the label.

**ILB-Juliet** — 6 tools rated · 26 fixtures · **15 (57.7%)** with ≥ 3 tools agreeing · 9 (34.6%) with all agreeing.

Cohen's κ — Interlace vs each competitor (Juliet) · *< 0.2 slight · 0.2–0.4 fair · 0.4–0.6 moderate · 0.6–0.8 substantial · 0.8–1.0 almost perfect*:

| Competitor | κ | Interpretation |
|---|---|---|
| no-unsanitized | 0.154 | slight |
| sonarjs | 0.077 | slight |
| microsoft-sdl | 0.077 | slight |
| eslint-plugin-security | 0 | slight |
| security-node | 0 | slight |

**ILB-Arena** — 18 tools rated · 77 fixtures · **67 (87%)** with ≥ 3 tools agreeing · 0 (0%) with all agreeing.

Cohen's κ — Interlace vs each competitor (Arena):

| Competitor | κ | Interpretation |
|---|---|---|
| sonarjs | 0.21 | fair |
| microsoft-sdl | 0.07 | slight |
| security-node | 0.065 | slight |
| no-secrets | 0.048 | slight |
| no-unsanitized | 0.022 | slight |
| eslint-plugin-security | 0 | slight |
| react | 0 | slight |
| jsx-a11y | 0 | slight |
| import | 0 | slight |
| promise | 0 | slight |
| jest | 0 | slight |
| vue | 0 | slight |
| angular | 0 | slight |
| regexp | -0.028 | worse than chance |
| eslint-plugin-n | -0.03 | worse than chance |
| jsdoc | -0.052 | worse than chance |
| unicorn | -0.072 | worse than chance |

### Over-fit detector — fixtures only Interlace catches

Vulnerable fixtures only Interlace caught are either a real coverage advantage *or* a fixture written to match our rule. Triage manually.

**Juliet:**

- CWE-022 / path-join-user.js
- CWE-022 / readfile-concat.js
- CWE-089 / dynamic-column.js
- CWE-089 / string-concat.js
- CWE-089 / template-literal.js
- CWE-918 / axios-user-url.js
- CWE-918 / fetch-user-url.js

**Arena:**

_(none)_

### Coverage breadth — corpus depth per CWE

A CWE with fewer than 2 vulnerable + 2 safe fixtures is too thin for its F1 to be meaningful (CI too wide).

| CWE | Vulnerable | Safe | Status |
|---|---|---|---|
| CWE-022 | 2 | 2 | ✓ |
| CWE-078 | 2 | 2 | ✓ |
| CWE-079 | 2 | 2 | ✓ |
| CWE-089 | 3 | 3 | ✓ |
| CWE-798 | 2 | 2 | ✓ |
| CWE-918 | 2 | 2 | ✓ |

✅ Every CWE meets the ≥ 2 fixture threshold.

**How to read:** high κ vs sonarjs / microsoft-sdl = our verdicts agree with credible commercial tools · high "≥ 3 tools agree" % = clear ground truth · empty over-fit list = TPs corroborated by competitors · no coverage gaps = every CWE has enough fixtures.


## How to refresh

```bash
npm run ilb:wild              # repopulates ILB-Wild, ILB-Edge, ILB-Cov, ILB-Perf
npm run ilb:arena             # ILB-Arena (head-to-head)
npm run ilb:juliet            # ILB-Juliet (synthetic CWE)
npm run ilb:ai                # ILB-AI
npm run ilb:llm:tokens        # ILB-LLM-Tokens (no API calls)
npm run ilb:llm:fix           # ILB-LLM-Fix (calls Claude CLI; opt-in)
npm run ilb:coverage          # regenerate inter-rater κ + over-fit + breadth (writes coverage.json)
npm run ilb:scorecard         # regenerate this page (reads coverage.json if present)
npm run ilb:regression        # gate against benchmark-results/baseline.json
```

_Generated by `scripts/ilb-scorecard.ts`_
