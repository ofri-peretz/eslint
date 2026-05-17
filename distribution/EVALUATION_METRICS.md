# Evaluation Metrics — measuring Interlace plugins vs ecosystem peers

> This document is the **comprehensive parameter list** for evaluating any
> ESLint plugin — ours or a neighbor's — across the dimensions a buyer,
> an evaluator, or an internal reviewer would care about. Each metric
> has: a definition, how it's computed, a target where one exists, a
> note on peer comparability, and a pointer to the existing
> Interlace-Linter-Benchmark (ILB) suite that measures it (or a flag
> that we don't measure it today).
>
> Companion docs:
>
> - `ECOSYSTEM_LANDSCAPE.md` — qualitative per-plugin map of who's in
>   the neighborhood.
> - `OXLINT_STOCK_OVERLAP.md` — rule-namespace overlap with Oxlint stock corpus.
> - `BIOME_STOCK_OVERLAP.md` — same for Biome (functional groups).
> - `../benchmarks/README.md` — authoritative meaning of every metric
>   word used below.
>
> Last updated: 2026-05-13.

---

## How to read this document

Each metric row uses a fixed shape:

| Column | Meaning |
| :--- | :--- |
| **Metric** | The dimension we're measuring. |
| **Definition** | Operational definition — what counts, what doesn't. |
| **Unit / range** | Quantitative form (e.g. percent, seconds, count). |
| **Target** | Our internal target where we've set one; otherwise *(no target)*. |
| **Peer-comparable?** | Whether this metric can be applied to a neighbor's plugin under the same fixture. Some metrics (e.g. MCP-server count) are us-specific; most should be peer-comparable to be useful. |
| **Existing bench** | The ILB suite + npm script that computes it today. (As of the 2026-05-13 gap-closure pass, every row has a measurement — see "Gap closure status" at the bottom.) |

A metric that is not peer-comparable is a leadership claim, not an
evaluation axis — those go in `ECOSYSTEM_LANDSCAPE.md`, not here.

---

## 1. Correctness

How right the rule is when it fires (or doesn't).

| Metric | Definition | Unit | Target | Peer-comparable? | Existing bench |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Precision (P)** | TP / (TP + FP). Of the findings the rule reports, how many are real. | ratio 0–1 | ≥ 0.95 | Yes | `ilb-arena`, per-rule |
| **Recall (R)** | TP / (TP + FN). Of the real bugs in the corpus, how many the rule catches. | ratio 0–1 | ≥ 0.90 | Yes | `ilb-arena`, per-rule |
| **F1 score** | 2·P·R / (P+R). Harmonic mean of P and R. | ratio 0–1 | ≥ 0.92 | Yes | `ilb-arena-quality`, `scorecard.md` |
| **F1 (federated wild)** | F1 computed on community-submitted Wild repos, not our curated fixtures. | ratio 0–1 | ≥ 0.85 | Yes | `ilb-federated`, `federated-wild.md` |
| **False-positive rate per kLoC** | FP count divided by thousands of lines of source scanned. Normalizes for project size. | count/kLoC | ≤ 0.5 | Yes | `ilb-arena`, derivable |
| **False-negative rate per known-CVE** | Of N seeded CVE-class bugs in the corpus, count missed. | count | 0 | Yes | `ilb-cwe-corpus` |
| **Severity calibration error** | Diff between rule-declared severity and corpus-observed exploitability. ILB-Confidence rates `error`/`warn`/`off` against ground truth. | bucketed | ≤ 1 bucket off | Yes | `ilb-confidence` |
| **Adversarial-rewrite resilience** | Recall under code mutated to bypass the rule without changing semantics. | ratio | ≥ 0.80 | Yes | `ilb-evade` |
| **Mutation-survival rate** | Of mutants we inject into the corpus, % the rule catches. Inverse signal: how many surviving mutants would slip past us. | ratio | ≤ 0.10 surviving | Yes | `ilb-mutate` |

**Why this category matters:** correctness is the floor. A fast rule
with poor precision generates noise; a precise rule with poor recall is
worse than not having it. Both matter equally and trade off; F1 is the
combined floor signal.

---

## 2. Coverage

How much of the relevant threat / quality landscape the plugin can see.

| Metric | Definition | Unit | Target | Peer-comparable? | Existing bench |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Total rule count** | Distinct rules shipped by the plugin. | count | (rule-budgeted) | Yes | `oxlint-jsplugins-manifest.json` |
| **CWE coverage** | Distinct CWEs at least one rule maps to. | count | ≥ 75 across all sec plugins | Yes (via SARIF / docs) | `ilb-cwe`, `cwe-coverage.md` |
| **CWE-coverage gaps** | Distinct CWEs in the OWASP/MITRE relevant set with **no** rule. Inverse of above. | count | minimize | Yes | `cwe-coverage-gaps.md` |
| **OWASP Top-10 coverage** | Of the 10 categories, how many have at least one rule. | count 0–10 | 10/10 | Yes | `compliance-crosswalk.md` |
| **OWASP-Top-10 depth** | Average rules per OWASP category. Inverse of "shallow checkbox coverage". | rules/category | ≥ 3 | Yes | `compliance-crosswalk.md` |
| **ISO 25010 quality-model coverage** | Distinct ISO 25010 quality attributes touched. | count 0–8 | ≥ 6 | Yes | `iso25010-crosswalk.md` |
| **CAPEC attack-pattern coverage** | Distinct CAPEC IDs at least one rule maps to. | count | grow | Yes (via SARIF) | `compliance-crosswalk.md` |
| **NIST SSDF coverage** | SSDF practices we have rules for. | count | grow | Yes | `compliance-crosswalk.md` |
| **OWASP ASVS coverage** | ASVS controls our security plugins cover. | count | grow | Yes | `compliance-crosswalk.md` |
| **API-surface coverage** | For domain plugins: % of relevant SDK / runtime API surface lint-aware. E.g. % of `node:crypto` exports our `node-security` plugin has rules for. | percent | ≥ 60% per vertical | Yes (per neighbor) | `npm run audit:api-surface` → `benchmark-results/api-surface-coverage.md`; per-plugin entries in `.agent/api-surface-manifest.json`; `:strict` variant fails CI when any plugin drops below floor |
| **Framework-version coverage** | Major versions of target framework currently supported (e.g. Express 4 + 5, NestJS 9/10/11). | count | latest + previous-major | Yes | declared in `peerDependencies` |

**Why this category matters:** rule count alone is noise — a 500-rule
plugin with zero CWE mapping is less useful than a 50-rule plugin with
full OWASP traceability for the buyer evaluating coverage.

---

## 3. Performance

How much it costs to run the plugin, and how that cost scales.

| Metric | Definition | Unit | Target | Peer-comparable? | Existing bench |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Cold lint time** | Wall-clock seconds, no cache, standard 10-kLoC corpus, fixed Node + ESLint version. | seconds | ≤ ESLint median | Yes | `ilb-arena`, `oxlint-jstier-vs-eslint.md` |
| **Warm / cached lint time** | Same, second consecutive run with `--cache --cache-location` stable. | seconds | < 50% cold | Yes | `ilb-cache-matrix` |
| **Cache hit rate** | Files served from cache as % of files scanned on warm run. | percent | ≥ 90% | Yes | `ilb-cache-matrix` |
| **Files per second (cold)** | Throughput on standard corpus. | files/s | grow | Yes | `ilb-arena`, derivable |
| **Lines per second (cold)** | Throughput in LoC/s. | LoC/s | grow | Yes | `ilb-arena`, derivable |
| **Per-rule median cost** | The latency contribution of each individual rule on the per-rule fixture. Identifies hot-spot rules. | milliseconds | ≤ 50 ms median | Yes | `ilb-flagship` |
| **Per-rule p95 cost** | Tail latency for individual rules. | milliseconds | ≤ 250 ms p95 | Yes | `ilb-flagship` |
| **Peak memory footprint** | RSS peak during a full corpus run. | MB | ≤ 1 GB on 50-kLoC | Yes | `npm run ilb:resource-profile` → `benchmark-results/resource-profile.{json,md}` |
| **Cold start time** | Time from CLI invocation to first byte of stdout. | ms | ≤ 1 s | Yes | `npm run ilb:resource-profile` → `benchmark-results/resource-profile.{json,md}` |
| **Speedup under Oxlint host** | Wall-time ratio of ESLint host vs Oxlint JS-plugin tier on the **same rule code**. | factor (x) | ≥ 10× | Us-only | `oxlint-jstier-vs-eslint.md` |

**Why this category matters:** performance gates editor-on-save
feasibility. A 50 ms per-rule rule blows the budget for pre-commit
hooks; a 500 ms rule blocks CI parallelism. Performance is also where
engine portability pays off (we get 13–22× under Oxlint host without
rewriting rules).

---

## 4. Engine portability

How many runtimes the plugin can run under, and how cleanly.

| Metric | Definition | Unit | Target | Peer-comparable? | Existing bench |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Supported engines (declared)** | Engines listed in rule `meta.interop.runtimes`. | count 1–4 | ≥ 2 by 2026-12 | Yes | `INTEROP_PHILOSOPHY.md` matrix |
| **Engines with CI-parity gate** | Of supported engines, how many have an automated parity fixture failing the build on drift. | count | ≥ 2 | Yes | `ilb-oxlint-parity`, `oxlint-parity.yml` |
| **Parity drift count** | Diagnostics that differ between engines on the shared fixture corpus. | count | 0 | Yes | `ilb-oxlint-parity` |
| **Parity-gate status** | Advisory vs blocker per `INTEROP_PHILOSOPHY.md` promotion conditions. | enum | blocker once shared count ≥ 20 + Oxlint 1.0 | Us-only | governance doc |
| **Shared-rule count** | Rules declared `runtimes: [eslint, oxlint, …]` with ≥ 2 entries. | count | ≥ 20 (promotion trigger) | Yes | manifest derivable |
| **Engine adapter test count** | Per-rule fixture runs per engine. Higher = more confidence in parity. | count | ≥ 3 per rule | Yes | `benchmarks/suites/ilb-oxlint-parity/` |

**Why this category matters:** see `INTEROP_PHILOSOPHY.md`. The thesis
is *rules portable, runtimes commodity*; this category is how the
thesis is measured.

---

## 5. Determinism & stability

Whether the plugin returns the same answer on the same code, and whether it's stable over time.

| Metric | Definition | Unit | Target | Peer-comparable? | Existing bench |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Run-to-run determinism** | Output diff across N consecutive runs on identical input. | count of diffs | 0 | Yes | `ilb-determinism` |
| **Output-order stability** | Whether finding order is deterministic across runs (matters for SARIF / CI diffs). | bool | true | Yes | `ilb-determinism` |
| **Autofix idempotence** | Running the fix twice produces the same final source. | bool | true | Yes | `autofix-bench.json` |
| **Cross-engine autofix byte-equality** | Same rule fix produces same output bytes under both engines. | bool | true | Yes | `ilb-oxlint-parity` |
| **Test-corpus stability** | How often the test corpus changes (signal of churn vs maturity). | commits/month on `benchmarks/corpus/` | low and trending lower | Us-only | `corpus-integrity.json` |
| **Per-rule mutation kill-rate** | % of injected mutants the rule still catches over time. | percent | ≥ 90% | Yes | `ilb-mutate` |

**Why this category matters:** determinism is *the* invariant that
makes a lint result actionable. Non-deterministic findings poison CI,
diff reviews, and agent-driven remediation.

---

## 6. Compatibility matrix

What environments the plugin runs in.

| Metric | Definition | Unit | Target | Peer-comparable? | Existing bench |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ESLint major support** | Declared peer + tested in CI. | set {8,9,10} | all three | Yes | `ilb-eslint-matrix`, `compatibility.mdx` |
| **Node major support** | Declared `engines.node` + tested in CI. | set {18,20,22,24} | all four | Yes | `ilb-node-matrix` |
| **TypeScript major support** | Tested under TS 5.x + 6.x rolling. | set | latest two | Yes | `ilb-tsc-matrix` |
| **Parser support** | Set of parsers the plugin works under (espree, @typescript-eslint/parser, Oxlint native, etc.). | set | ≥ 2 | Yes | `ilb-parser-matrix` |
| **Flat-config native** | Works with ESLint flat config (`eslint.config.js`) without legacy shims. | bool | true | Yes | declared |
| **Legacy `.eslintrc` working** | Backward-compat path still works. | bool | true (until v10 EOL) | Yes | `ilb-eslint-matrix` |

**Why this category matters:** the user shouldn't have to discover at
install time that the plugin doesn't run on their stack. Every cell in
this matrix has a CI fixture that fails the build on drift.

---

## 7. AI / agent readiness

How well the plugin serves coding agents, not just humans.

| Metric | Definition | Unit | Target | Peer-comparable? | Existing bench |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **MCP server availability** | Whether the plugin has a Model-Context-Protocol server an agent can call. | bool | true (per security plugin) | Yes (rare in field) | inventory in `PACKAGE_REGISTRY.md` |
| **SARIF output support** | Plugin emits SARIF that includes rule metadata + CWE / CVSS. | bool | true | Yes | `eslint-formatter-sarif` |
| **CWE / CVSS in rule meta** | Every rule has structured `meta.docs.cwe`, `meta.docs.cvss`. | percent of rules | 100% sec plugins | Yes | `compliance-crosswalk.json` |
| **Error-message LLM clarity** | LLM-rated score 0–5 for whether the message tells an agent *what to do*. | mean | ≥ 4 | Yes | `ilb-ai`, `baseline-llm.json` |
| **LLM-fix success rate** | Agent fed only the rule message can produce a correct fix on N test cases. | percent | ≥ 80% | Yes | `ilb-llm-fix` |
| **Token cost per fix** | Mean LLM tokens consumed by a typical agent fix-attempt loop. | tokens | minimize | Yes | `ilb-llm-tokens` |
| **Autofix coverage** | % of rules with deterministic autofix (no LLM call required). | percent | ≥ 50% | Yes | `autofix-bench.json` |
| **Suggestion coverage** | % of rules with non-autofix suggestions an editor can show. | percent | ≥ 70% | Yes | `autofix-bench.json` |
| **Structured-output schema stability** | Whether the SARIF / JSON output schema is versioned and stable. | bool | true | Yes | declared |

**Why this category matters:** agents are now a primary code consumer.
A plugin that flags a bug but produces an unparseable message wastes
agent tokens and human review time. This is one of our identified
community-leadership opportunities.

---

## 8. Documentation & developer experience

How fast a human (or agent) can adopt the plugin.

| Metric | Definition | Unit | Target | Peer-comparable? | Existing bench |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Rules with docs page** | % of rules with a docs entry. | percent | 100% | Yes | `doc-resync.json` |
| **Rules with example bad / good** | % of rules whose docs include both incorrect and correct code examples. | percent | 100% | Yes | `stress-test-docs.json` |
| **Rules with autofix demo** | % of fixable rules whose docs show before / after. | percent | 100% (of fixable) | Yes | `stress-test-docs.json` |
| **Docs / test alignment** | % of rule examples that match an actual test fixture. | percent | 100% | Yes | `doc-test-alignment.json` |
| **Setup time** | Median seconds from `npm install` to first lint result. | seconds | ≤ 60 | Yes | declared |
| **Config-line cost** | LoC required to enable the recommended preset (e.g. `extends: 'plugin:foo/recommended'` ≈ 1). | LoC | ≤ 3 | Yes | declared |
| **Editor / LSP signal** | Whether the rule surfaces correctly in major editors (VS Code, JetBrains via ESLint LSP / Oxc LS). | bool | true | Yes | manual spot-check |
| **Search discoverability** | Whether the rule docs page is indexed and ranks for the natural-language query an evaluator would type. | bool | true | Yes | `ilb-discover` |

**Why this category matters:** a rule that exists but can't be
adopted in < 60 s is invisible. DX is a force multiplier for every
other metric.

---

## 9. Adoption & maintenance health

Whether the plugin is alive, used, and trusted.

| Metric | Definition | Unit | Target | Peer-comparable? | Existing bench |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Weekly npm downloads** | npm registry weekly count for the plugin. | count | grow | Yes | `npm run peer-health` → `benchmark-results/peer-health.{json,md}`; weekly via `.github/workflows/peer-health.yml` |
| **GitHub stars** | Stars on the repo. | count | grow | Yes | `npm run peer-health` → `benchmark-results/peer-health.{json,md}` |
| **Days since last release** | Inverse maturity / activity signal. | days | ≤ 60 | Yes | `npm run peer-health` → `benchmark-results/peer-health.{json,md}` |
| **Release cadence** | Median release interval over last 12 months. | days | ≤ 30 | Yes | `npm run peer-health` → `benchmark-results/peer-health.{json,md}` |
| **Open-issue count** | Total open GitHub issues. | count | low and trending lower | Yes | `npm run peer-health` → `benchmark-results/peer-health.{json,md}` |
| **Time-to-first-response** | Median time from issue open to first maintainer reply (sampled across up to 30 most recent issues per peer; counts only first comments by `OWNER` / `MEMBER` / `COLLABORATOR` / `CONTRIBUTOR`). | hours | ≤ 48 | Yes | `npm run peer-health` → `benchmark-results/peer-health.{json,md}` `medianTimeToFirstResponseHours` field |
| **Contributor count (90-day)** | Distinct authors with commits in last 90 days. | count | ≥ 3 | Yes | `npm run peer-health` → `benchmark-results/peer-health.{json,md}` |
| **License** | OSS license string. | text | MIT or similar | Yes | `npm run peer-health` → `benchmark-results/peer-health.{json,md}` |
| **Maintained-by-foundation flag** | Whether maintained by ESLint / TypeScript / Vue / similar foundation vs single maintainer. | bool | informational | Yes | manual annotation in `scripts/fetch-peer-health.ts:PEERS` |
| **Has CHANGELOG** | Plugin keeps a changelog. | bool | true | Yes | `package.json` |

**Why this category matters:** a brilliant plugin that hasn't shipped in
12 months is a risk to adopt. The `peer-health` workflow snapshots
every neighbor on a weekly schedule and commits the snapshot to the
repo, so peer-quality drift is visible in PR review the same way our
own quality drift is.

---

## 10. Security-specific axes

Applies only to our security plugins and their security peers.

| Metric | Definition | Unit | Target | Peer-comparable? | Existing bench |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CVE-disclosure-to-rule latency** | Median days from public CVE disclosure (in a covered framework / library) to a rule shipping that detects the pattern. | days | ≤ 14 | Yes (audit log) | `npm run audit:cve-latency` → `benchmark-results/cve-rule-latency.{json,md}` (append-only audit log; CI-strict variant fails on policy violations) |
| **Zero-day-class coverage** | Distinct CWE classes appearing as new entries in the CVE-rule-latency audit log over a 12-month window. | count | grow | Yes | derivable from `benchmark-results/cve-rule-latency.json` `entries[].cwe` distinct count year-over-year |
| **Per-vertical depth** | For each domain (jwt, mongodb, pg, …), distinct attack patterns covered. | count | grow | Yes | derivable from `cwe-coverage.json` |
| **Secret-leak detection FP rate** | False positives in credential rules — a critical UX axis (a noisy secret rule gets disabled, which means it's worse than nothing). | per-kLoC | ≤ 0.1 | Yes | `competitor_study_2026-05-09.md` baselines |
| **Taint-tracking depth** | Inter-procedural taint hops a rule can follow before giving up. | hop count | ≥ 2 in deep tier | Yes | `pg/no-unsafe-query` instrumentation |
| **Severity audit fairness** | Diff between rule-declared severity and ground-truth exploitability across the audited corpus. | bucketed | ≤ 1 bucket off, ≥ 95% of rules | Yes | `severity-audit.json` |

**Why this category matters:** security plugins are evaluated against
threat models, not just AST patterns. A noisy secret-detection rule
generates more harm than benefit; a slow CVE-to-rule pipeline means
agents and humans hit known patterns we don't catch.

---

## 11. Cross-tool differential

How we compare against analyzers that aren't lint plugins.

| Metric | Definition | Unit | Target | Peer-comparable? | Existing bench |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Findings agreement matrix vs SAST** | Locations both Interlace and CodeQL / Semgrep / Snyk Code flag, vs only-one. | count per cell | publishable | Yes | `ilb-diff`, `differential.md` |
| **Interlace-only true-positive rate** | Of our unique findings (not flagged by SAST peers), what % is real on triage. | percent | ≥ 70% | Yes | `ilb-diff` triage |
| **SAST-only true-positive rate (we miss)** | Real findings the SAST peers catch and we miss. Honest gap signal. | percent | quantify | Yes | `ilb-diff` |

**Why this category matters:** the honest "we beat / we miss" picture
against SAST is more credible than self-published correctness numbers,
because two tools disagreeing is the data.

---

## 12. Operational / pipeline axes

How the plugin behaves in real CI / pre-commit / agent workflows.

| Metric | Definition | Unit | Target | Peer-comparable? | Existing bench |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **PR-time runtime** | Wall-clock seconds added to a typical PR by the plugin's recommended preset, on a 50-kLoC repo. | seconds | ≤ 30 | Yes | `ilb-arena` × scale |
| **Pre-commit-tier eligibility** | Whether the recommended preset's median runtime fits a < 5 s pre-commit budget on a typical staged-files set. | bool | true | Yes | derivable from `ilb-flagship` |
| **CI memory profile** | Whether the plugin runs cleanly on the smallest common CI runner (2-core / 7 GB GitHub-hosted). | bool | true | Yes | `npm run ilb:resource-profile` → `benchmark-results/resource-profile.{json,md}` `fitsCIBudget` column; the script exits non-zero on any preset over the 80% RSS ceiling |
| **GitHub Action friction** | Number of YAML lines required for a "lint on push" workflow using the plugin. | LoC | ≤ 10 | Yes | declared |
| **Editor-on-save friction** | Whether the recommended preset runs on save without perceptible lag in VS Code / JetBrains. | bool | true | Yes | manual |

**Why this category matters:** the lint feedback loop is only useful
if it fits where engineers actually work. Pipeline metrics close the
loop between "the plugin is correct" and "the plugin is used."

---

## Putting it together — the headline scorecard

We collapse the 50+ metrics above into the **ILB scorecard**
(`benchmark-results/scorecard.md`), which weights them as follows for
the headline ranking:

| Category | Weight | Why |
| :--- | ---: | :--- |
| Correctness (F1, FP/kLoC) | 30% | The floor — nothing else matters if the rule is wrong. |
| Coverage (CWE, OWASP, depth) | 20% | The shelf the plugin sits on. |
| Performance (cold + warm) | 15% | Editor-on-save feasibility. |
| Engine portability | 10% | The thesis (`INTEROP_PHILOSOPHY.md`). |
| AI / agent readiness | 10% | Future-proofing. |
| Docs / DX | 5% | Adoption multiplier. |
| Determinism / stability | 5% | CI-friendliness. |
| Compatibility matrix | 5% | "Does it run on my stack?" |

Adoption / maintenance health is **not** in the score but **is** in
the dashboard — a thriving project is a leading indicator we want
visibility on without it dominating the rank.

---

## Gap closure status

All five top-priority gaps named in the original 2026-05-13 draft of
this document have been closed. The new infrastructure lives in the
repo and is wired into `package.json` so every metric in the tables
above is now measurable on demand.

| Gap (original) | Status | Closure artifact |
| :--- | :--- | :--- |
| Memory + cold-start instrumentation | ✅ Closed | `scripts/ilb-resource-profile.ts` → `benchmark-results/resource-profile.{json,md}` (npm run ilb:resource-profile) |
| Peer-plugin health automation | ✅ Closed | `scripts/fetch-peer-health.ts` + `.github/workflows/peer-health.yml` (weekly schedule) → `benchmark-results/peer-health.{json,md}` |
| CVE-disclosure-to-rule latency audit log | ✅ Closed | `benchmark-results/cve-rule-latency.json` (append-only) + `scripts/audit-cve-rule-latency.ts` (recompute summary, fail on policy violations) |
| API-surface coverage per domain plugin | ✅ Closed | `.agent/api-surface-manifest.json` (10-plugin audit) + `scripts/audit-api-surface.ts` → `benchmark-results/api-surface-coverage.md` |
| Per-rule p95 budget enforcement | ✅ Closed | `benchmarks/budgets/per-rule-p95.json` + `scripts/check-per-rule-budget.ts` (CI gate; reads latest `ilb-flagship/<date>.json`) |

The repo invariant going forward: **no `(gap)` markers in this
document**. If a row needs a new measurement, write the bench /
script first, wire the npm script, then update the row's "Existing
bench" column with the script name. Adding a row without a measurement
is a documentation regression.

---

## How to use this document

- **Authoring a new rule?** Walk §1, §2, §7 — your rule has a
  correctness budget, a CWE mapping, and a message-clarity bar.
- **Reviewing a peer plugin for our content / docs?** Walk the whole
  list and fill the columns honestly. Publish what you find.
- **Adding a metric?** Edit this document first. Then add the bench
  suite. Then wire it into the scorecard weights if it's headline-class.
- **Removing a metric?** Same workflow in reverse. Document why.

This is the **vocabulary** for talking about plugin quality, ours and
neighbors'. If a claim in `ECOSYSTEM_LANDSCAPE.md`, the public
`compare.mdx`, an article, or marketing copy can't be reduced to one
of the rows above, it's a feeling, not a measurement — and it
shouldn't ship as a claim.
