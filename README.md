<p align="center">
  <a href="https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=monorepo" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Plugins, configs, resolvers, and tooling for ESLint-driven code quality
</p>

<p align="center">
  <a href="https://github.com/ofri-peretz/eslint/actions/workflows/quality.yml"><img src="https://github.com/ofri-peretz/eslint/actions/workflows/quality.yml/badge.svg?branch=main" alt="Quality Gate" /></a>
  <a href="https://github.com/ofri-peretz/eslint/actions/workflows/codeql.yml"><img src="https://github.com/ofri-peretz/eslint/actions/workflows/codeql.yml/badge.svg?branch=main" alt="CodeQL" /></a>
  <a href="https://api.securityscorecards.dev/projects/github.com/ofri-peretz/eslint"><img src="https://api.securityscorecards.dev/projects/github.com/ofri-peretz/eslint/badge" alt="OpenSSF Scorecard" /></a>
  <a href="https://codecov.io/gh/ofri-peretz/eslint"><img src="https://codecov.io/gh/ofri-peretz/eslint/branch/main/graph/badge.svg" alt="Codecov" /></a>
  <a href="https://github.com/changesets/changesets"><img src="https://img.shields.io/badge/maintained%20with-changesets-176de3.svg" alt="Maintained with Changesets" /></a>
  <a href="https://turbo.build/"><img src="https://img.shields.io/badge/built%20with-turborepo-1d1d1d.svg" alt="Built with Turborepo" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.9+-blue.svg" alt="TypeScript" /></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-24+-green.svg" alt="Node.js" /></a>
  <a href="https://vitest.dev/"><img src="https://img.shields.io/badge/Vitest-4.0-6E9F18.svg" alt="Vitest" /></a>
  <a href="https://github.com/ofri-peretz/eslint"><img src="https://img.shields.io/github/stars/ofri-peretz/eslint?style=flat&logo=github&label=Star" alt="GitHub stars" /></a>
  <a href="https://dev.to/ofri-peretz"><img src="https://img.shields.io/badge/Dev.to-Follow-0A0A0A?logo=devdotto&logoColor=white" alt="Follow on Dev.to" /></a>
</p>

<p align="center">
This monorepo houses battle-tested ESLint plugins, sharable configs, and supporting utilities that help teams enforce architecture, security, and consistency with actionable, LLM-friendly feedback.
</p>

<!-- INTERLACE:GROWTH_CTA -->
<p align="center">
  <strong>⭐ <a href="https://github.com/ofri-peretz/eslint">Star the repo</a></strong> &nbsp;·&nbsp;
  <a href="https://github.com/ofri-peretz/eslint/subscription">👀 Watch releases</a> &nbsp;·&nbsp;
  <a href="https://eslint.interlace.tools/articles?utm_source=github&utm_medium=referral&utm_campaign=monorepo">📨 Follow the writeups</a> &nbsp;·&nbsp;
  <a href="https://eslint.interlace.tools/stats?utm_source=github&utm_medium=referral&utm_campaign=monorepo">📊 Live metrics</a>
</p>
<p align="center">
  <sub>If these plugins caught a real bug for you, a star is the signal that keeps the ecosystem maintained.</sub>
</p>

---

## Philosophy

**Interlace** fosters **strength through integration**. We **interlace** security directly into your workflow, creating a resilient fabric of code. Tools should **guide rather than gatekeep**, providing educational feedback that strengthens developers.

**Why an independent ecosystem?** 🚀 Ship fast without upstream bureaucracy • 🤖 AI-optimized messages (CWE, OWASP, fixes) • ⚡ Unified codebase for performance • 🏗️ Consistent patterns across all plugins • 📚 Educational "why" explanations • 🔧 Modern ESLint flat config (v8 / v9 / v10)

All rules are **clean-room implementations** — familiar naming, better engineering.

**The deeper case:**

- [`cicd-impact/value-philosophy.md`](cicd-impact/value-philosophy.md) — what value is (Buffett, Munger, software-industry voices), the two ruling systems (capitalism + humanism), why static code analysis is hard to measure, and the unbroken chain from human incentives down to a single ESLint rule.
- [`cicd-impact/philosophy.md`](cicd-impact/philosophy.md) — how CI/CD friction expresses itself along three axes (money, velocity, deliverability) plus the investor frame, and where a faster / better lint suite plugs in to lower the bill on all four.
- [`cicd-impact/`](cicd-impact/) — a forkable calculator that turns the philosophy into a `$/CI minute` figure for any GitHub Actions repo.

---

## 📦 Available Packages

Independently versioned ESLint-focused packages: plugins, configs, and supporting utilities.

### Security Plugins

| Package                                                                           | Description                  | Downloads                                                                                |
| --------------------------------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------- |
| [`eslint-plugin-secure-coding`](./packages/eslint-plugin-secure-coding)           | Comprehensive security rules | ![npm](https://img.shields.io/npm/dm/eslint-plugin-secure-coding?style=flat-square)      |
| [`eslint-plugin-node-security`](./packages/eslint-plugin-node-security)           | Node.js core-module security | ![npm](https://img.shields.io/npm/dm/eslint-plugin-node-security?style=flat-square)      |
| [`eslint-plugin-jwt`](./packages/eslint-plugin-jwt)                               | JWT security best practices  | ![npm](https://img.shields.io/npm/dm/eslint-plugin-jwt?style=flat-square)                |
| [`eslint-plugin-pg`](./packages/eslint-plugin-pg)                                 | PostgreSQL security          | ![npm](https://img.shields.io/npm/dm/eslint-plugin-pg?style=flat-square)                 |
| [`eslint-plugin-browser-security`](./packages/eslint-plugin-browser-security)     | Browser/frontend security    | ![npm](https://img.shields.io/npm/dm/eslint-plugin-browser-security?style=flat-square)   |
| [`eslint-plugin-express-security`](./packages/eslint-plugin-express-security)     | Express.js security          | ![npm](https://img.shields.io/npm/dm/eslint-plugin-express-security?style=flat-square)   |
| [`eslint-plugin-nestjs-security`](./packages/eslint-plugin-nestjs-security)       | NestJS security              | ![npm](https://img.shields.io/npm/dm/eslint-plugin-nestjs-security?style=flat-square)    |
| [`eslint-plugin-lambda-security`](./packages/eslint-plugin-lambda-security)       | AWS Lambda security          | ![npm](https://img.shields.io/npm/dm/eslint-plugin-lambda-security?style=flat-square)    |
| [`eslint-plugin-vercel-ai-security`](./packages/eslint-plugin-vercel-ai-security) | Vercel AI SDK security       | ![npm](https://img.shields.io/npm/dm/eslint-plugin-vercel-ai-security?style=flat-square) |

### Code Quality & Architecture Plugins

| Package                                                                     | Description                              | Downloads                                                                             |
| --------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------- |
| [`eslint-plugin-modularity`](./packages/eslint-plugin-modularity)           | Structural integrity and DDD patterns    | ![npm](https://img.shields.io/npm/dm/eslint-plugin-modularity?style=flat-square)      |
| [`eslint-plugin-modernization`](./packages/eslint-plugin-modernization)     | ESNext migration and syntax evolution    | ![npm](https://img.shields.io/npm/dm/eslint-plugin-modernization?style=flat-square)   |
| [`eslint-plugin-maintainability`](./packages/eslint-plugin-maintainability) | Cognitive load and clean code            | ![npm](https://img.shields.io/npm/dm/eslint-plugin-maintainability?style=flat-square) |
| [`eslint-plugin-reliability`](./packages/eslint-plugin-reliability)         | Runtime stability and error safety       | ![npm](https://img.shields.io/npm/dm/eslint-plugin-reliability?style=flat-square)     |
| [`eslint-plugin-operability`](./packages/eslint-plugin-operability)         | Production readiness and resource health | ![npm](https://img.shields.io/npm/dm/eslint-plugin-operability?style=flat-square)     |
| [`eslint-plugin-conventions`](./packages/eslint-plugin-conventions)         | Team-specific habits and styles          | ![npm](https://img.shields.io/npm/dm/eslint-plugin-conventions?style=flat-square)     |
| [`eslint-plugin-import-next`](./packages/eslint-plugin-import-next)         | High-fidelity dependency graph analysis  | ![npm](https://img.shields.io/npm/dm/eslint-plugin-import-next?style=flat-square)     |
| [`eslint-plugin-react-features`](./packages/eslint-plugin-react-features)   | React best practices and optimization    | ![npm](https://img.shields.io/npm/dm/eslint-plugin-react-features?style=flat-square)  |
| [`eslint-plugin-react-a11y`](./packages/eslint-plugin-react-a11y)           | React accessibility and WCAG compliance  | ![npm](https://img.shields.io/npm/dm/eslint-plugin-react-a11y?style=flat-square)      |

### Supporting Tools

| Package                                                | Description                               | Downloads                                                                        |
| ------------------------------------------------------ | ----------------------------------------- | -------------------------------------------------------------------------------- |
| [`@interlace/eslint-devkit`](./packages/eslint-devkit) | Build your own team-specific ESLint rules | ![npm](https://img.shields.io/npm/dm/@interlace/eslint-devkit?style=flat-square) |

---

## 🎯 Why This Repo?

ESLint is the backbone for keeping large codebases healthy. These packages target the real problems teams face at scale: inconsistent patterns, architectural drift, security gaps, and slow onboarding. The plugins deliver guardrails plus explanations tuned for humans and LLMs alike.

### Problems We Solve

| Challenge                      | How these plugins help                                                          |
| ------------------------------ | ------------------------------------------------------------------------------- |
| 🏗️ **Architectural Drift**     | Enforce module boundaries and prevent circular dependencies automatically       |
| 🔒 **Security Blind Spots**    | Catch hardcoded secrets, injection vulnerabilities, and unsafe patterns early   |
| 📚 **Inconsistent Patterns**   | Codify team conventions into automated rules that teach while they enforce      |
| 🤖 **AI-Assisted Development** | LLM-optimized error messages that AI assistants can actually understand and fix |
| 🚀 **Developer Onboarding**    | New team members learn the codebase through guardrails, not just documentation  |

### Design Principles

- **Battle-Tested**: Every tool solves a real problem encountered in production
- **Actionable Feedback**: Error messages explain the "why" and show how to fix
- **LLM-Ready**: Optimized for modern AI-assisted development workflows
- **Zero Configuration Burden**: Sensible defaults with escape hatches when needed

---

## 🛟 ESLint Support Matrix

> **Last data refresh:** 2026-05-09 (window: 2026-05-02 → 2026-05-09, source: npm registry)

| ESLint Major | Weekly Downloads | Share | Status                           |
| :----------- | :--------------- | :---- | :------------------------------- |
| **v10**      | 11.8M            | 9.24% | ✅ Supported (forward-looking)   |
| **v9**       | 76.9M            | 60.4% | ✅ Supported (current default)   |
| **v8**       | 30.9M            | 24.3% | ✅ Supported (legacy active)     |
| v7 and older | 7.7M             | 6.1%  | ❌ Unsupported (EOL)             |

All published packages declare `"eslint": "^8.0.0 || ^9.0.0 || ^10.0.0"` as a peer dependency.

### Node.js compatibility

| Node.js | Status | Notes |
| :--- | :--- | :--- |
| **24.x** | ✅ Active development | Repo's `engines.node` pin; what CI runs against |
| **22.x LTS** | ✅ Supported | Recommended for production users |
| **20.x LTS** | ✅ Supported | Long-term-stable baseline |
| **18.x** | ✅ Supported (minimum) | Lowest declared `engines.node` across published packages |
| ≤ 17 | ❌ Unsupported | EOL upstream |

The 18.x floor is set by every package's `engines.node: ">=18.0.0"`. Bumping the floor follows the same gate logic as ESLint majors — a deliberate decision tracked in [docs/ESLINT_VERSION_SUPPORT.md](./docs/ESLINT_VERSION_SUPPORT.md).

### Our baseline for supporting a major version

A major is **supported** when either:

1. **20% gate** — it has ≥20% of weekly downloads on npm (v8 and v9 today), OR
2. **Forward-looking exception** — it is the next major after a currently-supported version (v10 today, the future of v9). We ship support pre-emptively so users can upgrade ahead of the curve, not behind it.

A supported major is in our `peerDependencies`, our benchmark matrix, and our CI matrix. Versions are dropped only after two consecutive refreshes below the gate AND a successor that is itself supported.

The data above can be re-fetched at any time via `npm run stats:eslint-versions` ([script](./scripts/fetch-eslint-version-stats.ts)). Full policy: [docs/ESLINT_VERSION_SUPPORT.md](./docs/ESLINT_VERSION_SUPPORT.md).

---

## 🎯 How We Measure Quality (FP / FN / TP / TN)

Every ESLint finding is one of four things — and we track all four, per rule, per CWE, per OSS repo:

| | **Code IS vulnerable / problematic** | **Code is safe / clean** |
| :--- | :--- | :--- |
| **Rule fires** | **TP** — true positive (signal) | **FP** — false positive (noise) |
| **Rule silent** | **FN** — false negative (miss) | **TN** — true negative (correct quiet) |

Three rates fall out of those counts:

- **Precision** = TP / (TP + FP) — of the things we flag, what fraction are real?
- **Recall** = TP / (TP + FN) — of the things we should flag, what fraction did we catch?
- **F1** = harmonic mean of precision and recall — one number that punishes either being bad.

**Recall first, precision second.** A missed CWE is worse than a noisy rule, and we don't regress recall to chase FPs. Today's headline: **100% recall on Arena and Juliet** with **97.6% precision** ([CLAIMS.md](./CLAIMS.md) holds every claim with its evidence file).

The full philosophy — synthetic vs. wild corpora, severity-classification policy, multi-rater agreement (Cohen's κ), and the ten principles — lives in [`benchmarks/README.md`](./benchmarks/README.md).

---

## ⚡ Performance — measured weekly, not claimed

<!-- INTERLACE:BENCH_TABLE — every cell is a generated badge. Do not hand-edit
     numbers here: they render from the weekly benchmark and are served from
     GitHub Pages, so this markup stays frozen while the values refresh. -->

![last verified](https://ofri-peretz.github.io/eslint/badges/verified.svg) ![corpus](https://ofri-peretz.github.io/eslint/badges/corpus.svg) ![file-set parity](https://ofri-peretz.github.io/eslint/badges/parity.svg)

| Stack | Cold | Warm | Findings | Files |
| :--- | :---: | :---: | :---: | :---: |
| **Interlace on ESLint** | ![cold](https://ofri-peretz.github.io/eslint/badges/ours-cold.svg) | ![warm](https://ofri-peretz.github.io/eslint/badges/ours-warm.svg) | ![findings](https://ofri-peretz.github.io/eslint/badges/ours-findings.svg) | ![files](https://ofri-peretz.github.io/eslint/badges/ours-files.svg) |
| **Interlace on oxlint** | ![cold](https://ofri-peretz.github.io/eslint/badges/ours-oxlint-cold.svg) | ![warm](https://ofri-peretz.github.io/eslint/badges/ours-oxlint-warm.svg) | ![findings](https://ofri-peretz.github.io/eslint/badges/ours-oxlint-findings.svg) | ![files](https://ofri-peretz.github.io/eslint/badges/ours-oxlint-files.svg) |
| Community plugins (ESLint) | ![cold](https://ofri-peretz.github.io/eslint/badges/competitor-cold.svg) | ![warm](https://ofri-peretz.github.io/eslint/badges/competitor-warm.svg) | ![findings](https://ofri-peretz.github.io/eslint/badges/competitor-findings.svg) | ![files](https://ofri-peretz.github.io/eslint/badges/competitor-files.svg) |
| oxlint built-ins *(different scope)* | ![cold](https://ofri-peretz.github.io/eslint/badges/oxlint-stock-cold.svg) | ![warm](https://ofri-peretz.github.io/eslint/badges/oxlint-stock-warm.svg) | ![findings](https://ofri-peretz.github.io/eslint/badges/oxlint-stock-findings.svg) | ![files](https://ofri-peretz.github.io/eslint/badges/oxlint-stock-files.svg) |

**Cold** = `--no-cache`. **Warm** = `--cache`, primed — the number you feel on
every save and every CI run.

`Interlace on oxlint` runs the *same rulesets* through the oxlint engine via our
[JS-plugin shims](./tools/oxlint-plugins/). Same rules, different engine.

### Head-to-head, by job

Whole-plugin comparisons mislead in both directions: a plugin bundles jobs its
rival does not have, so an aggregate delta is partly a difference in *scope*
rather than speed. The unit of comparison here is a **job** — a concrete
capability — with the specific rules named on both sides.

![head-to-head](https://ofri-peretz.github.io/eslint/badges/jobs-summary.svg) ![uncontested](https://ofri-peretz.github.io/eslint/badges/jobs-uncontested.svg)

| Job | Result |
| :--- | :---: |
| Circular dependencies | ![circular deps](https://ofri-peretz.github.io/eslint/badges/job-circular-dependencies.svg) |
| DOM XSS sinks | ![dom xss](https://ofri-peretz.github.io/eslint/badges/job-dom-xss-sinks-innerhtml-and-friends.svg) |
| Hardcoded secrets | ![secrets](https://ofri-peretz.github.io/eslint/badges/job-hardcoded-secrets-credentials.svg) |
| Command / shell injection | ![command injection](https://ofri-peretz.github.io/eslint/badges/job-command-shell-injection.svg) |
| ReDoS | ![redos](https://ofri-peretz.github.io/eslint/badges/job-redos-catastrophic-backtracking.svg) |
| Path traversal | ![path traversal](https://ofri-peretz.github.io/eslint/badges/job-path-traversal-non-literal-fs-access.svg) |
| Timing-attack comparison | ![timing](https://ofri-peretz.github.io/eslint/badges/job-timing-attack-unsafe-comparison.svg) |

Two of those rows are losses. They stay: a table where every row favours us is
authored, not measured. The full breakdown — including where competitors are
genuinely better — lives in
[`benchmarks/suites/ilb-headline/matchups.ts`](./benchmarks/suites/ilb-headline/matchups.ts),
where every cited rule is CI-verified to exist.

### Who we compare against

Named, versioned, and linked — so you can check we did not pick a weak opponent:

[`eslint-plugin-security`](https://www.npmjs.com/package/eslint-plugin-security) ·
[`eslint-plugin-sonarjs`](https://www.npmjs.com/package/eslint-plugin-sonarjs) ·
[`@microsoft/eslint-plugin-sdl`](https://www.npmjs.com/package/@microsoft/eslint-plugin-sdl) ·
[`eslint-plugin-no-unsanitized`](https://www.npmjs.com/package/eslint-plugin-no-unsanitized) ·
[`eslint-plugin-security-node`](https://www.npmjs.com/package/eslint-plugin-security-node) ·
[`eslint-plugin-no-secrets`](https://www.npmjs.com/package/eslint-plugin-no-secrets) ·
[`eslint-plugin-regexp`](https://www.npmjs.com/package/eslint-plugin-regexp) ·
[`eslint-plugin-import`](https://www.npmjs.com/package/eslint-plugin-import)

### How it is measured

- **Scope**: only our **SDK-agnostic** plugins — `secure-coding`, `node-security`, `browser-security`, `import-next`. Framework-bound plugins (pg, jwt, nestjs-security…) have no comparable competitor; an uncontested win there tells you nothing.
- **Corpus**: two real repos — [nestjs](https://github.com/nestjs/nest) (Node) and [shadcn-ui](https://github.com/shadcn-ui/ui) (frontend), shallow-cloned at a recorded commit SHA.
- **Same file set**: every stack lints an identical glob, and parity is *asserted* — a run where the stacks saw different files is refused, not published.
- **Median of N** after a discarded warmup, with min–max spread recorded so a noisy machine is visible rather than hidden.
- **Failures are recorded, never dropped.** A crash cannot be timed as a fast run; a stack that processed 0 files fails the gate instead of rendering an impossibly fast bar.
- **oxlint built-ins** run a different rule scope (no secrets, injection, or CSP analysis). Shown for context and excluded from "fastest" highlighting — a different job, not a peer.

Every number is regenerated by
[`weekly-benchmark.yml`](./.github/workflows/weekly-benchmark.yml) (Mondays,
09:00 UTC) on public runners, stored append-only, and published as the badges
above. Reproduce locally: `npm run ilb:headline -- --repo=nestjs --repeat=5`.

---

## 👥 Who Is This For?

| Role                     | How these packages help                                                     |
| ------------------------ | --------------------------------------------------------------------------- |
| **Tech Leads**           | Enforce architectural decisions automatically instead of during code review |
| **Platform Teams**       | Provide guardrails that scale across multiple teams and repositories        |
| **Security Engineers**   | Catch vulnerabilities at development time, not in production                |
| **Engineering Managers** | Reduce onboarding time and maintain consistency as teams grow               |
| **Senior Engineers**     | Codify institutional knowledge into automated tooling                       |

---

## 🤝 Contributing

We welcome contributions! If you've faced a problem in your organization that could benefit others, we'd love to hear about it.

- **Have an idea?** [Start a discussion](https://github.com/ofri-peretz/eslint/discussions)
- **Found a bug?** [Open an issue](https://github.com/ofri-peretz/eslint/issues)
- **Want to contribute code?** See our Contributing Guide (planned)

---

## 🔗 Get Started

| Resource                                                                   | Description                       |
| -------------------------------------------------------------------------- | --------------------------------- |
| 📦 [npm packages](https://www.npmjs.com/search?q=eslint-plugin)            | Install and start using the tools |
| 💬 [GitHub Discussions](https://github.com/ofri-peretz/eslint/discussions) | Ask questions and share ideas     |
| 🐛 [Report Issues](https://github.com/ofri-peretz/eslint/issues)           | Found a bug? Let us know          |

---

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz) — See [LICENSE](LICENSE) for details.

---

Made with ❤️ from lessons learned in the trenches
