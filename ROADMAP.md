# 🗺️ Project Roadmap

This document tracks current focus areas and forward-looking plans for the Interlace ESLint ecosystem. Authoritative sources for measured claims live in [`CLAIMS.md`](./CLAIMS.md); this file is the narrative.

Last refresh: 2026-05-13.

---

## 🔒 Security Plugins

11 security plugins covering ~250 rules across distinct domains.

| Plugin                             | Focus Area                                                                | Status    |
| ---------------------------------- | ------------------------------------------------------------------------- | --------- |
| `eslint-plugin-secure-coding`      | General application security (27 rules)                                   | ✅ Stable |
| `eslint-plugin-node-security`      | Node.js core modules (fs, child_process, vm, crypto, Buffer) (33 rules)   | ✅ Stable |
| `eslint-plugin-browser-security`   | Browser / DOM / postMessage / iframe (45 rules)                           | ✅ Stable |
| `eslint-plugin-jwt`                | JWT best practices and algorithm hygiene (13 rules)                       | ✅ Stable |
| `eslint-plugin-pg`                 | PostgreSQL / SQL injection (13 rules)                                     | ✅ Stable |
| `eslint-plugin-mongodb-security`   | MongoDB / NoSQL query injection (16 rules)                                | ✅ Stable |
| `eslint-plugin-express-security`   | Express.js middleware hygiene (10 rules)                                  | ✅ Stable |
| `eslint-plugin-lambda-security`    | AWS Lambda runtime + IAM (14 rules)                                       | ✅ Stable |
| `eslint-plugin-nestjs-security`    | NestJS DI / guards / interceptors (6 rules)                               | ✅ Stable |
| `eslint-plugin-vercel-ai-security` | Vercel AI SDK / OWASP LLM Top 10 (19 rules)                               | ✅ Stable |

> **Cryptography rules** are now consolidated into `eslint-plugin-node-security` (the historical standalone crypto package is deprecated). Recommend `eslint-plugin-node-security` exclusively for new installs.

### OWASP coverage

- **OWASP Web Top 10 2021** — comprehensive coverage via `secure-coding` + domain-specific plugins
- **OWASP LLM Top 10 2025** — partial coverage via `vercel-ai-security`
- **OWASP Mobile Top 10** — framework-agnostic rules in `secure-coding` apply

---

## 🏗️ Code Quality & Reliability Plugins

10 plugins covering ~180 rules.

| Plugin                         | Focus Area                                                | Status    |
| ------------------------------ | --------------------------------------------------------- | --------- |
| `eslint-plugin-import-next`    | Modern import/export analysis, cycle detection (57 rules) | ✅ Stable |
| `eslint-plugin-react-features` | React patterns, hooks, performance, migration (53 rules)  | ✅ Stable |
| `eslint-plugin-react-a11y`     | React accessibility (38 rules)                            | ✅ Stable |
| `eslint-plugin-conventions`    | Naming / shape conventions (12 rules)                     | ✅ Stable |
| `eslint-plugin-maintainability`| Complexity, duplication, error-handling (13 rules)        | ✅ Stable |
| `eslint-plugin-reliability`    | Runtime reliability, error-handling (10 rules)            | ✅ Stable |
| `eslint-plugin-operability`    | Operational best practices (7 rules)                      | 🟨 Growing |
| `eslint-plugin-modularity`     | Module architecture / boundaries (6 rules)                | 🟨 Growing |
| `eslint-plugin-modernization`  | Modernization toward current JS/TS idioms (4 rules)       | 🟨 Growing |

### Coverage gap (tracked)

Combined code-quality rule count (~52) trails `eslint-plugin-unicorn` (100+) and `eslint-plugin-sonarjs` (~60). Expansion is on the roadmap (see § Future Plans below), prioritized by precision/recall meeting the per-rule SLO in [`.agent/flagship-rules.md`](./.agent/flagship-rules.md).

---

## ⭐ Flagship rules

10 rules selected as the strategic moat — each has a narrow defensible firing signature, is type-unaware (so it runs in oxlint's JS-plugin tier), and ships with per-rule benchmarks. Authoritative spec at [`.agent/flagship-rules.md`](./.agent/flagship-rules.md).

| Rule                                                | Anchors                                                  |
| --------------------------------------------------- | -------------------------------------------------------- |
| `import-next/no-cycle`                              | Modern replacement for `eslint-plugin-import/no-cycle`   |
| `pg/no-unsafe-query`                                | SQL injection (CWE-89)                                   |
| `secure-coding/no-hardcoded-credentials`            | Credentials with entropy + context gating (CWE-798)      |
| `secure-coding/no-redos-vulnerable-regex`           | Catastrophic backtracking via scslre NFA (CWE-1333)      |
| `mongodb-security/no-unsafe-query`                  | NoSQL operator injection (CWE-943)                       |
| `jwt/no-algorithm-none`                             | JWT algorithm confusion (CWE-327)                        |
| `browser-security/no-postmessage-wildcard-origin`   | Iframe origin spoofing (CWE-346)                         |
| `react-features/hooks-exhaustive-deps`              | Head-to-head vs `react-hooks/exhaustive-deps`            |
| `react-a11y/alt-text`                               | Head-to-head vs `jsx-a11y/alt-text`                      |
| `vercel-ai-security/no-unsafe-output-handling`      | OWASP LLM02                                              |

Flagship preset is composable: `[importNext, pg, secureCoding, mongodb, jwt, browserSecurity, reactFeatures, reactA11y, vercelAi].map(p => p.configs.flagship)`.

---

## 🧰 Tooling & integrations

| Component                       | Purpose                                                        | Status         |
| ------------------------------- | -------------------------------------------------------------- | -------------- |
| `interlace-cli`                 | One-command init, lint, MCP-server launch                      | ✅ Stable      |
| `eslint-formatter` / `-sarif`   | Compact and SARIF output formats for CI / LLM consumers        | ✅ Stable      |
| `interlace-vscode`              | VS Code extension — squiggles, audit-on-save, MCP launcher     | 🟨 Internal / dogfooding (not on Marketplace yet) |
| `interlace-telemetry` (+ collector) | Opt-in usage telemetry for which rules fire in the wild    | 🟨 Internal    |
| `eslint-devkit`                 | Shared rule helpers, AST utilities, taint-analysis primitives  | ✅ Stable      |

### Engine portability

All 398 rules in the ecosystem have an oxlint-portable manifest in [`.agent/oxlint-jsplugins-manifest.json`](./.agent/oxlint-jsplugins-manifest.json) (currently `398/398 compatible`). The portability contract is described in [`INTEROP_PHILOSOPHY.md`](./INTEROP_PHILOSOPHY.md).

---

## 🛟 ESLint compatibility

We support **ESLint v8, v9, and v10** (v10 included per our forward-looking [support policy](./docs/ESLINT_VERSION_SUPPORT.md)). v10's removed `context.getFilename()` / `getSourceCode()` / `getCwd()` APIs do not appear in our rule code (verified 2026-05-13; see [`CLAIMS.md`](./CLAIMS.md) § "Supports ESLint 8, 9, and 10"). CI gate: [`.github/workflows/eslint-version-matrix.yml`](./.github/workflows/eslint-version-matrix.yml) runs the cross-version matrix on every PR.

**Tracked transitions** — re-evaluated each time `npm run stats:eslint-versions` refreshes:

- **v8 → deprecation candidate** when v10 crosses the 20% gate AND v8 falls below it on two consecutive refreshes
- **v11 → support window opens** as soon as v11.0.0 ships (forward-looking rule), without waiting for share data
- **EOL milestones** — track upstream ESLint EOL announcements; align removals with the next major release

Last data refresh: 2026-05-09 (v9: 60.4%, v8: 24.3%, v10: 9.2%).

---

## 📅 Future plans

### Active (next 90 days)

- **`/play` playground** — in-browser Monaco editor + ESLint, 6 canonical flagship-rule snippets, deep links to rule docs. Hero CTA on the docs homepage. Spec at [`PLAYGROUND_SPEC.md`](./PLAYGROUND_SPEC.md).
- ~~**Public scorecard page** (`/scorecard`)~~ — ✅ shipped 2026-05-16. Auto-renders from the latest dated JSON in [`benchmarks/results/ilb-flagship/`](./benchmarks/results/ilb-flagship/) that covers all 10 flagship rules — provenance block (ESLint / oxlint / Node versions + run date + link to source JSON), per-rule latency + findings table, and the cache-effectiveness median row. Lock tests at [`apps/docs/src/__tests__/scorecard-lock.test.ts`](./apps/docs/src/__tests__/scorecard-lock.test.ts) and [`apps/docs/src/__tests__/scorecard-source-integrity.test.ts`](./apps/docs/src/__tests__/scorecard-source-integrity.test.ts) pin the page surface and the data loader respectively.
- **Real external corpus integration** — today's `ilb-cwe-corpus` is self-authored. A real NIST Juliet adaptation (or OWASP Benchmark JS port, or extended real-OSS-corpus replay) is the path to defensible F1 numbers.
- **Statistical rigor in benches** — `--repeat=N`, median + 95% Wilson CIs on every cited number (known limitation per `ilb-flagship` suite).
- ~~**`@interlace/eslint-config` meta-package**~~ — ✅ shipped 2026-05-16. One install + one import for `flagship`, `security`, `quality`, `react`, or full `recommended` (19 plugins). See [`packages/eslint-config-interlace`](./packages/eslint-config-interlace/README.md). Structural locks at [`packages/eslint-config-interlace/src/index.test.ts`](./packages/eslint-config-interlace/src/index.test.ts) pin the flagship preset to `.agent/flagship-rules.md` and fail closed if any plugin drops its `recommended` / `flagship` export.

### Backlog

- **Code-quality coverage** — close the rule-count gap vs `eslint-plugin-unicorn` / `eslint-plugin-sonarjs`. Prioritized by per-rule SLO compliance.
- **`no-cycle` rebuild on SCC** — current cache-poisoning fix is shipped; SCC is the structural floor (matches `eslint-plugin-import`'s algorithm). Quarterly review item.
- **V2 formatter** — first-fix accuracy improvement + compact-mode token cost. Pending claims tracked in [`CLAIMS.md`](./CLAIMS.md).
- **VS Code Marketplace publish** — gated on internal dogfooding maturity; 0.1.0 does not ship publicly.
- **Additional framework-specific security plugins** — only when distribution / signal demands it. Moat is already broad.

---

## 📞 Feedback

Suggestions and corrections: [open a discussion](https://github.com/ofri-peretz/eslint/discussions). Public-marketing-grade claims must trace to a row in [`CLAIMS.md`](./CLAIMS.md) — if a claim is missing, route the suggestion to "Pending claims" rather than asserting it directly.
