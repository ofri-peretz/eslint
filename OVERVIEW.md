# Repo Overview — Where Things Live

> **You're a stranger in this repo.** This page tells you which directory holds what, and which file is the right entry point for your role. The branded entry is [`README.md`](README.md); this is the *navigation map*.

## The two frameworks

This repo holds two complete, complementary frameworks. They were built independently; they reinforce each other.

| Framework | Question it answers | Lives in |
| :--- | :--- | :--- |
| **Interlace Lint Bench (ILB)** | *Is this lint rule accurate, fast, and stable?* — F1, precision, recall, ms/file, drift across {Node, TS compiler, ESLint, parser, cache} | [`benchmarks/`](benchmarks/) |
| **CI/CD Impact** | *What does a CI minute cost the org?* — `$/CI minute`, money × velocity × deliverability axes, falsifiable predictions, vendor-neutral analyzer scorecard | [`cicd-impact/`](cicd-impact/) |

ILB measures **rule quality**. CI/CD Impact measures **org-economic value**. Together they let you reason about adoption ROI in finance terms — not just F1 terms.

## Pick your role

| You are a… | Start here |
| :--- | :--- |
| **Developer dropping Interlace into a project** | [`apps/docs/content/docs/launch.mdx`](apps/docs/content/docs/launch.mdx) — the public landing |
| **Buyer comparing SAST tools** | [`apps/docs/content/docs/compare.mdx`](apps/docs/content/docs/compare.mdx) — Interlace vs. CodeQL vs. Semgrep vs. Snyk Code |
| **AI agent (Claude Code, Cursor) asking what to read** | [`.agent/rules/bench-context.md`](.agent/rules/bench-context.md) — single ~250-line digest |
| **Reviewer / researcher** evaluating the bench methodology | [`benchmarks/README.md`](benchmarks/README.md) — 10 principles, vocabulary contract, the 10 benches |
| **Finance / engineering manager** asking what the bench is worth | [`cicd-impact/README.md`](cicd-impact/README.md) — `$/CI minute` derivation |
| **Contributor opening a PR** | [`CONTRIBUTING.md`](CONTRIBUTING.md) — gates, severity contract, vocabulary contract |
| **Auditor reviewing project governance** | [`GOVERNANCE.md`](GOVERNANCE.md) — roles, decision rules, conflict policy |
| **MITRE / OWASP submitter** | [`benchmarks/audits/INDEX.md`](benchmarks/audits/INDEX.md) — the submission packets |
| **Plugin author** wanting MCP integration | [`packages/eslint-mcp-base/README.md`](packages/eslint-mcp-base/README.md) — wrap your plugin in <30 lines |
| **CI engineer** | [`.github/actions/audit/README.md`](.github/actions/audit/README.md) — one-line GitHub Action |

## Doc surfaces — which is canonical for what?

| If a claim disagrees, this wins | For… |
| :--- | :--- |
| [`benchmarks/state.json`](benchmarks/state.json) | Roadmap status (machine-readable) |
| [`benchmark-results/scorecard.md`](benchmark-results/scorecard.md) | Live bench numbers (regenerated; never paste numbers into static docs) |
| [`benchmarks/lib/result-schema.json`](benchmarks/lib/result-schema.json) | Vocabulary contract (every result file's allowed fields) |
| [`benchmarks/README.md`](benchmarks/README.md) | Bench philosophy + 10 principles + 10 benches |
| [`cicd-impact/methodology.md`](cicd-impact/methodology.md) | `$/CI minute` formula derivation |
| [`scripts/ilb-wild.mjs`](scripts/ilb-wild.mjs) (`BENCHMARK_REPOS` array) | Which OSS repos are in the wild corpus |
| Per-rule `meta.docs` | The CWE / CVSS / confidence / severity for that rule |

## Three frameworks of "philosophy"

Three different doc surfaces use the word *philosophy*; they don't conflict — they sit at different layers:

| Doc | Layer | Question |
| :--- | :--- | :--- |
| [`cicd-impact/value-philosophy.md`](cicd-impact/value-philosophy.md) | **Foundational** — Buffett / Munger / capitalism + humanism | What *is* value? Why is static analysis hard to measure? |
| [`cicd-impact/philosophy.md`](cicd-impact/philosophy.md) | **Operational** — three axes (money, velocity, deliverability) | What does CI/CD friction *cost* an organization? |
| [`benchmarks/README.md`](benchmarks/README.md) §1 | **Measurement** — 10 principles, FP/FN contracts, vocabulary | How do we make accuracy claims that survive hostile review? |

A reader landing on any one is welcome to start there; the other two are linked.

## Strategic surfaces (read for direction)

| Doc | Purpose |
| :--- | :--- |
| [`benchmarks/LEADERSHIP_ROADMAP.md`](benchmarks/LEADERSHIP_ROADMAP.md) | 4-phase plan to lead JS SAST (humans + agents). 67+ items shipped to date |
| [`benchmarks/state.json`](benchmarks/state.json) | Machine-readable status of every roadmap item |
| [`benchmarks/audits/INDEX.md`](benchmarks/audits/INDEX.md) | Index of dated outreach + readiness packets (MITRE / OWASP / replication / governance / paper) |
| [`cicd-impact/predictions-registry.md`](cicd-impact/predictions-registry.md) | Falsifiable predictions; evaluated against later observations |
| [`benchmarks/FP_FN_REMEDIATION_TRACKER.md`](benchmarks/FP_FN_REMEDIATION_TRACKER.md) | Active FP/FN triage queue |

## Operational artifacts (read to use)

| Surface | What you do with it |
| :--- | :--- |
| [`packages/interlace-cli/`](packages/interlace-cli/) | `interlace audit / init / bench / mcp / doctor` |
| [`packages/<plugin>-mcp/`](packages/) (×11) | Each ESLint plugin as an MCP server — one per security vertical |
| [`packages/eslint-formatter-sarif/`](packages/eslint-formatter-sarif/) | SARIF v2.1.0 output for GHAS / Defender / GitLab |
| [`packages/interlace-telemetry/`](packages/interlace-telemetry/) + [`packages/interlace-telemetry-collector/`](packages/interlace-telemetry-collector/) | Opt-in fleet telemetry; client + reference collector |
| [`packages/interlace-vscode/`](packages/interlace-vscode/) | VS Code extension — squiggles + one-click MCP server boot |
| [`Dockerfile`](Dockerfile) | Multi-arch image at `ghcr.io/ofri-peretz/interlace` |
| [`.github/actions/audit/`](. github/actions/audit/) | One-line GitHub Action |
| [`.github/workflows/`](. github/workflows/) | Publish, supply-chain attestation, scorecard, benchmarks, etc. |
| [`examples/vulnerable-app/`](examples/vulnerable-app/) | Demo target — one fixture per flagship rule |

## How the directories relate

```text
ofri-peretz/eslint
├── README.md                    branded entry (badges + pitch)
├── OVERVIEW.md                  this file (navigation map)
├── CONTRIBUTING.md              how to land a change
├── GOVERNANCE.md                roles + decision rules
├── CODE_OF_CONDUCT.md
├── SECURITY.md
├── apps/docs/                   public docs site (launch, compare, integrations)
├── packages/                    16 npm packages: 11 plugin MCPs + plugins + cli + telemetry + ...
├── benchmarks/                  ILB framework — measurement
│   ├── README.md                  the bench bible
│   ├── BASELINE_MATRIX.md         plugin → OSS-repo map
│   ├── LEADERSHIP_ROADMAP.md      4-phase plan
│   ├── state.json                 machine-readable status
│   ├── audits/                    dated outreach + readiness packets (see audits/INDEX.md)
│   ├── corpus/                    CWE-mapped fixtures
│   ├── lib/                       shared helpers (toolchain, history, stats, schema)
│   └── suites/                    per-bench runners (ilb-arena, ilb-juliet, ilb-wild, …)
├── benchmark-results/           live numbers (regenerated; do not paste into static docs)
├── cicd-impact/                 CI/CD Impact framework — economics
│   ├── README.md                  start here for org-economic questions
│   ├── value-philosophy.md        foundational
│   ├── philosophy.md              operational (three axes)
│   ├── methodology.md             $/CI minute formula derivation
│   ├── analyzer-evaluation-framework.md   vendor-neutral scorecard
│   ├── predictions-registry.md    falsifiable predictions
│   ├── data/                      real Actions-API data
│   ├── outputs/                   computed outputs (unit-cost.json, …)
│   └── scripts/                   fetch + compute + render scripts
├── examples/vulnerable-app/     demo target (one fixture per flagship rule)
├── scripts/                     ilb-* + audit-* + check-* + sync-* + ...
└── .agent/                      agent-orchestration (rules, workflows, skills, agents)
    └── rules/bench-context.md     ← single-read prelude for AI agents
```

## What this doc is NOT

- Not the pitch — that's [`apps/docs/content/docs/launch.mdx`](apps/docs/content/docs/launch.mdx).
- Not the bench bible — that's [`benchmarks/README.md`](benchmarks/README.md).
- Not the CI-cost philosophy — that's [`cicd-impact/`](cicd-impact/).
- Not the changelog — that's automated via Changesets per package.

If a claim in this doc disagrees with a doc it points to, the linked doc wins. This page only routes; it doesn't author.
