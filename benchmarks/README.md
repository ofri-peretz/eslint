# Interlace Lint Bench (ILB)

**Reproducible benchmarks for the Interlace ESLint ecosystem** — measuring detection accuracy, real-world exposure, false-positive rates, throughput, and rule coverage against industry-standard methodologies.

> **What this is:** a workspace of seven independent benchmarks, each answering one question with one comparable score. Every result is reproducible from this directory via `npm run ilb:*` commands.
>
> **Latest headline (2026-05-03):** Interlace ranks **#1 on every accuracy bench** — F1 **98.8%** on head-to-head security (vs sonarjs 47.5%), F1 **76.5%** with **100% recall** on the synthetic CWE corpus (Juliet-style), F1 **64.8%** on quality. **9.9 ms/file** lint cost on 1.7M lines of real OSS code.

---

## What is "ILB"?

**ILB = Interlace Lint Bench.** Internal naming convention so every bench has a clear name and methodology version. There are seven:

| Short | Question | Score | Versioning |
|---|---|---|---|
| **ILB-Juliet** | "On a synthetic CWE-mapped corpus (academic standard), do we detect what we should?" | F1 + OWASP BAS | v1.0 |
| **ILB-Arena** | "Vs every other ESLint security plugin on the same fixtures, who wins?" | F1 (rank 1–N) | v1.0 |
| **ILB-Arena-Quality** | Same, for quality plugins | F1 (rank 1–N) | v1.0 |
| **ILB-Wild** | "What do we find on real popular OSS code (1.7M LoC, 20 repos)?" | findings / kLoC | v1.0 |
| **ILB-Edge** | "On adversarial-real code (Three.js's `eval`, etc.), how noisy are we?" | FP rate (post-triage) | v1.0 |
| **ILB-Cov** | "Of all our rules, what fraction fires on real code?" | activation rate (%) | v1.0 |
| **ILB-AI** | "Do our rules catch what LLMs write?" | vuln detection rate | v1.0 |

Each bench is **single-dimension** (one bench, one number), **versioned** (corpus changes bump the version), and has **a frozen corpus** (pinned commits / fixed prompts / deterministic seeds).

---

## Where do these methodologies come from? (Industry context)

The benchmarks are designed to mirror established academic and industry standards where they exist, and to define new standards where none do for JavaScript.

### What we mirror from existing standards

| Methodology | Where it's used in industry | Our bench that mirrors it | What we adopt |
|---|---|---|---|
| **NIST SARD / Juliet Test Suite** | Used by NIST, MITRE, and academic security-tool researchers since 2010. The standard for synthetic vulnerability fixtures in C/C++/Java. | **ILB-Juliet** | CWE-organized directory layout (`corpus/CWE-NNN/{vulnerable,safe}/`), per-CWE manifests with ground-truth annotations, F1 / precision / recall scoring |
| **OWASP Benchmark Project** v1.2 | OWASP's official Java security tool comparison. Used by tool vendors like Checkmarx, Fortify, SonarSource for self-reported accuracy claims. | **ILB-Juliet + ILB-Arena** | Benchmark Accuracy Score (BAS = TPR − FPR, Youden's J statistic), Truth-Table-per-CWE format, per-tool comparison tables |
| **MITRE CWE Top 25** | The authoritative list of "most dangerous software weaknesses" — referenced by every government procurement / compliance framework. | **Corpus prioritization** | We expand the CWE corpus prioritizing CWEs from the Top 25 list |
| **CVSS 3.1** | First.org's industry-standard severity scoring. Used in NVD, GitHub Advisories, every vulnerability disclosure. | **Per-rule metadata** | Every Interlace rule has a CVSS score in its message metadata; ILB results report findings by CVSS |
| **Wilson Score Interval** | The statistical-best-practice for proportion confidence intervals at small N. Adopted by Google's research community, academic security papers. | **All accuracy benches** | Confidence intervals on F1, recall, precision (especially relevant for our smaller corpora) |
| **Chi-squared (χ²) test** | Standard test for categorical variable independence — used in clinical trials, A/B testing, and AI evaluation papers. | **ILB-AI** | Used to test whether different LLMs produce statistically distinguishable vulnerability rates |
| **MLPerf Inference scenarios** | The MLCommons consortium's standard for ML inference benchmarks. Submitters: NVIDIA, Google, Intel, AWS. | **ILB-Perf** | Cold / warm / incremental scenarios, median-of-N runs, peak RSS measurement, versioned submissions |
| **SPEC CPU / SPECjbb** | Standard Performance Evaluation Corporation benchmarks — the de facto authority on server/CPU performance for 30+ years. | **ILB-Perf** | Strict reproducibility: pinned compiler/runtime versions, frozen corpus, public methodology |
| **HumanEval / SWE-Bench** | Anthropic / OpenAI / DeepMind use these for LLM code-generation evaluations. The basis for "Claude solves X% of GitHub issues" claims. | **ILB-AI** | Zero-context prompt isolation, structured prompt categories, per-model statistical comparison |
| **WMDP (Weapons of Mass Destruction Proxy)** | Center for AI Safety's benchmark for measuring if LLMs help with harmful code. | **ILB-AI framing** | "Do LLMs ship vulnerable code?" — same security framing applied to JavaScript |
| **Adversarial GLUE / CheckList** | NLP community standard for stress-testing models on legitimate-but-tricky inputs. | **ILB-Edge** | Curated corpus of *legitimate* risky-looking code (Three.js's `eval`, Webpack's HMR `eval`) — findings here default to FP candidates pending triage |

### What we define ourselves (no JavaScript predecessor)

| Bench | Why we had to invent it |
|---|---|
| **ILB-Wild** | There's no standard "lint findings on popular OSS" bench. The closest are GitHub CodeQL's public scan dashboards (Microsoft) and Snyk's vulnerability database — both proprietary. We pin commits per repo, publish the corpus, and version the registry. |
| **ILB-Cov** | Rule-activation-rate isn't a thing in the lint world. Loosely analogous to mutation-testing coverage (Stryker, PIT). We use it to surface dead rules. |

### Who uses these methodologies in the wild

- **NIST SARD / Juliet** — used by every academic paper on static analysis, by US government procurement (FedRAMP), and by tool vendors (Coverity, SonarSource, Checkmarx) for self-reported accuracy.
- **OWASP Benchmark v1.2** — used by [Veracode](https://www.veracode.com/), [Fortify (Micro Focus)](https://www.microfocus.com/en-us/cyberres/application-security/static-code-analyzer), [Checkmarx SAST](https://checkmarx.com/), [SonarQube](https://www.sonarsource.com/) — all publish their BAS scores against the OWASP corpus as marketing/evaluation material.
- **MLPerf Inference** — annual submissions from NVIDIA, AMD, Intel, Google Cloud, AWS, Qualcomm. Results form the basis of every "X TFLOPS at Y watts" claim in industry hardware comparisons.
- **HumanEval/SWE-Bench** — every major LLM lab (Anthropic, OpenAI, Google DeepMind, Meta) reports HumanEval pass@1 in their model release notes. SWE-Bench is the standard for "can this AI fix real GitHub issues?"
- **Wilson Score / χ²** — required by every peer-reviewed security paper on tool accuracy.

By mirroring these methodologies we get **for free** the credibility that an "F1 98.8%" claim carries when the corpus is published, fixtures are open-source, and the formula is the OWASP/NIST one. The same numbers using ad-hoc methodology mean nothing.

---

## Latest headline numbers (2026-05-03)

| Bench | Interlace | Strongest competitor | Read |
|---|---|---|---|
| ILB-Arena | **F1 98.8%** (rank 1/18) | sonarjs 47.5% | We detect 40/40 vulnerable patterns; closest credible competitor catches 14 |
| ILB-Juliet | **F1 76.5%, 100% recall** (rank 1/6) | sonarjs 40% | 13/13 vulnerable patterns detected across 6 CWEs; 8 FPs to triage |
| ILB-Arena-Quality | **F1 64.8%** (rank 2/8) | unicorn 50.8% | Beaten only by jsdoc, which over-fires on every fixture (66.1% noise, not signal) |
| ILB-Wild | 7,058 findings / 4.14 per kLoC | n/a (no ground truth on real OSS) | Across 20 repos, 1.7M LoC |
| ILB-Edge | 4,106 FP candidates pending triage | n/a | Each candidate is a rule-refinement opportunity |
| ILB-Perf | **9.9 ms/file** median, 698 MB peak RSS | n/a | Well under the 15 ms/file SLO |
| ILB-Cov | 20% (41/207 rules fired) | n/a | Below 70% SLO; expanding corpus drives this up |
| ILB-AI (Feb 2026) | 68% vuln detection on LLM-generated code | n/a | Stale — re-run pending |

For full per-bench drilldowns, plugin breakdowns, and action items, read [`DETAILED_REPORT.md`](./DETAILED_REPORT.md). For plain-English explanations of what each bench tests and where the evidence lives, read [`BENCHMARK_GUIDE.md`](./BENCHMARK_GUIDE.md).

---

## Quick start

From the repo root:

```bash
# All seven benches (full run; ~30 min for ILB-Wild on first uncached invocation)
npm run ilb:wild              # ILB-Wild — popular OSS (default: all repos)
npm run ilb:edge              # ILB-Edge — adversarial-real subset (5 FP-candidate repos)
npm run ilb:juliet            # ILB-Juliet — synthetic CWE corpus (~30 sec)
npm run ilb:arena             # ILB-Arena — security head-to-head (~2 min)
npm run ilb:arena:quality     # ILB-Arena-Quality (~1 min)
npm run ilb:perf:import       # ILB-Perf — import plugin throughput
npm run ilb:ai                # ILB-AI — requires GOOGLE_API_KEY / ANTHROPIC_API_KEY

# Reports
npm run ilb:scorecard         # cross-bench scorecard (top-line numbers)
npm run ilb:audit             # live competitor matrix from run.js sources
npm run ilb:regression        # gate against benchmark-results/baseline.json
```

Single-target / focused runs:

```bash
npm run ilb:wild -- --repo three.js              # one OSS target
npm run ilb:wild -- --list                       # show target matrix
npm run ilb:arena -- --plugin=interlace          # one plugin
npm run ilb:juliet -- --cwe=CWE-089              # one CWE
```

CI gate ([`.github/workflows/benchmark.yml`](../.github/workflows/benchmark.yml)) runs ILB-Wild on a smoke subset (`sst,vercel-ai,lodash`) for every PR touching plugins or scripts, posts the scorecard as a sticky PR comment, and fails on regression vs `benchmark-results/baseline.json`.

---

## Directory structure

```
benchmarks/
├── README.md                   # this file
├── BENCHMARK_GUIDE.md          # plain-English: what each bench tests, evidence paths
├── COMPETITIVE_LANDSCAPE.md    # per-bench competitor matrix narrative
├── DETAILED_REPORT.md          # full results + plugin breakdown + action items
├── RESULTS.md                  # exec summary "where we stand"
├── ILB_NAMING.md               # methodology spec & versioning rules
├── BENCHMARK_GUIDELINES.md     # statistical rigor + reproducibility standards
│
├── package.json                # @interlace/benchmarks workspace
├── project.json                # Nx targets
│
├── corpus/                     # ILB-Juliet CWE-mapped fixtures
│   ├── CWE-022/                # Path Traversal
│   ├── CWE-078/                # OS Command Injection
│   ├── CWE-079/                # Cross-Site Scripting
│   ├── CWE-089/                # SQL Injection
│   ├── CWE-798/                # Hardcoded Credentials
│   └── CWE-918/                # Server-Side Request Forgery (SSRF)
│
├── suites/                     # bench runners (each suite is one ILB)
│   ├── ilb-arena/              # security head-to-head + 18 competitor configs
│   ├── ilb-arena-quality/      # quality head-to-head + 8 competitor configs
│   ├── ilb-juliet/             # CWE-mapped accuracy scorer
│   ├── ilb-ai/                 # LLM-generated code security
│   └── ilb-perf-import/        # import-next vs eslint-plugin-import throughput
│
├── results/                    # historical per-bench result files (JSON)
│   ├── ilb-arena/<date>.json
│   ├── ilb-arena-quality/<date>.json
│   ├── ilb-juliet/<date>.json
│   ├── ilb-ai/<date>.json
│   └── ilb-perf-import/<date>.json
│
├── lib/                        # shared bench utilities
└── scripts/                    # fixture generators + cross-bench tooling
```

Per-Wild-run output lives at the repo root (`benchmark-results/<date>/`), since the Wild bench is invoked from the repo root and produces cross-cutting artifacts (scorecard, baseline, per-repo reports).

---

## Methodology — at-a-glance

For each accuracy bench, every claim has a JSON receipt:

1. **Frozen corpus.** Pinned commits, fixed prompts, deterministic seeds. Bumping any of these bumps the bench version.
2. **Per-rule traceability.** Every result file includes which rule fired on which fixture/file/line. Drill from "F1 98.8%" → "100% recall on SQL injection" → "the rule that fired on `string-concat.js` was `pg/no-unsafe-query` at line 4."
3. **Statistical honesty.** Wilson Score CIs on small-N proportions; χ² on categorical comparisons; confidence intervals on every published rate.
4. **Single-dimension scores.** No "blended score" hiding tradeoffs. F1 is F1; ms/file is ms/file. Cross-bench comparisons happen in the unified scorecard ([`benchmark-results/scorecard.md`](../benchmark-results/scorecard.md)), not in any single bench.
5. **Industry parallel cited.** Every bench either mirrors a published methodology (NIST/OWASP/MLPerf) or explicitly says "we define this" — never claims to follow a standard that doesn't apply.

Full statistical methodology: [`BENCHMARK_GUIDELINES.md`](./BENCHMARK_GUIDELINES.md).

---

## Adding a new bench

The naming + structural rules:

1. **Single dimension only.** If it measures two things, it's two benches.
2. **Single-number top-line score.** Comparable across versions.
3. **`ILB-<short>` + version.** `ILB-Watch v1.0`, etc.
4. **Industry parallel cited or "we define this."** No false claims.
5. **Frozen corpus per version.** Bump the version when corpus changes.
6. **Documented in [`ILB_NAMING.md`](./ILB_NAMING.md)** before adding the runner.

Then create a new `suites/ilb-<name>/` directory, add a runner that emits to `results/ilb-<name>/<date>.json`, and wire `npm run ilb:<name>` into `package.json`.

---

## Reproducibility

Every published result is reproducible from a fresh clone:

```bash
git clone https://github.com/ofri-peretz/eslint
cd eslint
npm install                    # workspaces are auto-resolved (this directory is one)
npm run ilb:scorecard          # cross-bench scorecard (no run, just reads latest results)
npm run ilb:wild               # produces a fresh ILB-Wild result against pinned commits
npm run ilb:arena              # head-to-head security comparison
```

If a number in this repo doesn't match what you reproduce, open an issue with the corpus version and your environment (`node --version`, `process.platform`).

### Where target OSS repos get cloned

ILB-Wild needs to clone ~21 GitHub repositories (1.7M LoC total). Resolution order for the clone destination:

| Priority | Path | When it's used |
|---|---|---|
| 1 | `$ILB_OOS_DIR` (env var) | CI / custom layouts. Set this in `.github/workflows/benchmark.yml` to control disk usage. |
| 2 | `~/repos/ofriperetz.dev/oos/` | Default for local development on the maintainer's machine. Shared across multiple bench scripts and other tooling. |
| 3 | `<repo>/.bench-repos/` | Fallback if the home-dir layout is non-standard. Keeps the bench self-contained. |

The chosen path is logged on every `ilb:wild` run. To override:

```bash
ILB_OOS_DIR=/tmp/oss-cache npm run ilb:wild       # one-off
echo "export ILB_OOS_DIR=$HOME/oss" >> ~/.zshrc   # persistent
```

The bench is **portable across environments** (Linux/macOS/Windows + CI/local) — no hardcoded user paths in any script. `os.homedir()` is used for the default and an env override is always honoured.

---

## License

This benchmark suite is part of the Interlace ESLint ecosystem and ships under the same MIT license as the plugins it benchmarks.

The competitor plugins benchmarked (`eslint-plugin-security`, `eslint-plugin-sonarjs`, `@microsoft/eslint-plugin-sdl`, etc.) are each used under their own respective licenses. We don't redistribute them — we depend on their published npm releases.
