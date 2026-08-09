<p align="center">
  <a href="https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=monorepo" target="_blank"><img src="https://eslint.interlace.tools/logos/interlace.svg" alt="Interlace" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://oxc.rs" target="_blank"><img src="https://eslint.interlace.tools/logos/oxlint.svg" alt="oxlint" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://eslint.org" target="_blank"><img src="https://eslint.interlace.tools/logos/eslint.svg" alt="ESLint" height="90" /></a>
</p>

<p align="center">
  <strong>The Interlace ESLint Ecosystem</strong> — security and code-quality rules that explain themselves,<br />
  to your team and to the AI writing half your code.<br />
  Every finding ships with a CWE, a CVSS score, an OWASP mapping, and the fix.
</p>

<!-- Trust signals — every badge here is computed from a live source, not hand-set. -->
<p align="center">
  <a href="https://github.com/ofri-peretz/eslint/actions/workflows/quality.yml"><img src="https://github.com/ofri-peretz/eslint/actions/workflows/quality.yml/badge.svg?branch=main" alt="Quality Gate" /></a>
  <a href="https://github.com/ofri-peretz/eslint/actions/workflows/codeql.yml"><img src="https://github.com/ofri-peretz/eslint/actions/workflows/codeql.yml/badge.svg?branch=main" alt="CodeQL" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/ofri-peretz/eslint"><img src="https://api.securityscorecards.dev/projects/github.com/ofri-peretz/eslint/badge" alt="OpenSSF Scorecard" /></a>
  <a href="https://codecov.io/gh/ofri-peretz/eslint"><img src="https://codecov.io/gh/ofri-peretz/eslint/branch/main/graph/badge.svg" alt="Coverage" /></a>
  <a href="https://github.com/ofri-peretz/eslint/commits/main"><img src="https://img.shields.io/github/last-commit/ofri-peretz/eslint?label=last%20commit&logo=github" alt="Last commit" /></a>
  <a href="https://docs.npmjs.com/generating-provenance-statements"><img src="https://img.shields.io/badge/npm-provenance%20signed-CB3837?logo=npm&logoColor=white" alt="Published with npm provenance" /></a>
</p>

<!-- Stack facts — what you need to know before you install. -->
<p align="center">
  <a href="./docs/ESLINT_VERSION_SUPPORT.md"><img src="https://img.shields.io/badge/ESLint-8.40%20%7C%209%20%7C%2010-4B32C3?logo=eslint&logoColor=white" alt="ESLint 8.40 | 9 | 10" /></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-%E2%89%A518-5FA04E?logo=nodedotjs&logoColor=white" alt="Node.js 18+" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.9%2B-3178C6?logo=typescript&logoColor=white" alt="TypeScript 5.9+" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
  <a href="https://github.com/changesets/changesets"><img src="https://img.shields.io/badge/maintained%20with-changesets-176de3.svg" alt="Maintained with Changesets" /></a>
  <a href="https://turbo.build/"><img src="https://img.shields.io/badge/built%20with-turborepo-1d1d1d.svg" alt="Built with Turborepo" /></a>
</p>

<!-- INTERLACE:GROWTH_CTA -->
<p align="center">
  <a href="https://github.com/ofri-peretz/eslint"><img src="https://img.shields.io/github/stars/ofri-peretz/eslint?style=social&label=Star" alt="GitHub stars" /></a>
  &nbsp;
  <a href="https://dev.to/ofri-peretz"><img src="https://img.shields.io/badge/Dev.to-Follow-0A0A0A?logo=devdotto&logoColor=white" alt="Follow on Dev.to" /></a>
</p>
<p align="center">
  <strong>⭐ <a href="https://github.com/ofri-peretz/eslint">Star the repo</a></strong> &nbsp;·&nbsp;
  <a href="https://github.com/ofri-peretz/eslint/subscription">👀 Watch releases</a> &nbsp;·&nbsp;
  <a href="https://dev.to/ofri-peretz">📨 Follow the writeups</a> &nbsp;·&nbsp;
  <a href="https://ofriperetz.dev/stats?utm_source=github&utm_medium=referral&utm_campaign=monorepo">📊 Live metrics</a>
</p>
<p align="center">
  <sub>If these plugins caught a real bug for you, a star is the signal that keeps the ecosystem maintained.</sub>
</p>

---

## Install one plugin, catch a real bug

```bash
npm i -D eslint eslint-plugin-postgresql-security
```

```js
// eslint.config.mjs
import pg from 'eslint-plugin-postgresql-security';

export default [pg.configs.recommended];
```

```js
// app.js
import { Pool } from 'pg';
const pool = new Pool();

export async function getUser(id) {
  return pool.query(`SELECT * FROM users WHERE id = '${id}'`); // ← interpolated
}
```

```text
app.js
  5:21  error  🔒 Unsafe SQL query construction detected (template literal). | CRITICAL
   Fix: Use parameterized queries ($1, $2) instead of interpolating values.
   https://owasp.org/www-community/attacks/SQL_Injection   postgresql-security/no-unsafe-query
```

That message is the whole thesis. **Severity** so you can triage it, **the fix** so
a human doesn't have to go looking, and **a citation** so an LLM asked to "fix the
lint errors" produces a parameterized query instead of a plausible-looking escape
helper. Machine-readable equivalents ship via the
[SARIF formatter](./packages/eslint-formatter-sarif) for GitHub code scanning.

---

## The ecosystem

<!-- AUTO-GENERATED:NUMBERS:START - Do not edit manually -->

**30 published plugins · 465 rules** — 21 security plugins (260 rules), 7 code-quality plugins (107 rules), 2 React plugins (98 rules). <sub>Counts generated 2026-08-05 from the source tree — never hand-typed.</sub>

<!-- AUTO-GENERATED:NUMBERS:END -->

Every package is versioned, released, and installable on its own. Take the two
that match your stack; ignore the other twenty-eight.

<!-- AUTO-GENERATED:PACKAGE_TABLE:START - Do not edit manually -->

### 🔒 Security — languages, platforms & SDKs

<sub>18 plugins · 209 rules</sub>

| Package                                                                                                | Rules | What it catches                                                                                                                                                                                                                             | Docs                                                                                                                                       | Downloads                                                                                              |
| :----------------------------------------------------------------------------------------------------- | ----: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------- |
| [`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security)       |    45 | Detects DOM XSS, postMessage abuse, tokens in localStorage, insecure cookies, clickjacking, mixed content, and CSP gaps                                                                                                                     | [docs](https://eslint.interlace.tools/docs/security/plugin-browser-security?utm_source=github&utm_medium=referral&utm_campaign=monorepo)   | ![downloads](https://img.shields.io/npm/dm/eslint-plugin-browser-security?style=flat-square&label=)    |
| [`eslint-plugin-node-security`](https://www.npmjs.com/package/eslint-plugin-node-security)             |    37 | Detects command injection, path traversal, SSRF, zip slip, and weak crypto (MD5/SHA-1, ECB, static IV) in fs, child_process, vm, and crypto                                                                                                 | [docs](https://eslint.interlace.tools/docs/security/plugin-node-security?utm_source=github&utm_medium=referral&utm_campaign=monorepo)      | ![downloads](https://img.shields.io/npm/dm/eslint-plugin-node-security?style=flat-square&label=)       |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding)             |    28 | Detects LDAP, XPath, XXE, GraphQL and template injection, unsafe deserialization, ReDoS, missing authentication, and PII in logs                                                                                                            | [docs](https://eslint.interlace.tools/docs/security/plugin-secure-coding?utm_source=github&utm_medium=referral&utm_campaign=monorepo)      | ![downloads](https://img.shields.io/npm/dm/eslint-plugin-secure-coding?style=flat-square&label=)       |
| [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security)   |    19 | Detects prompt injection, system-prompt leaks, hardcoded API keys, and unvalidated model output in generateText and streamText                                                                                                              | [docs](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security?utm_source=github&utm_medium=referral&utm_campaign=monorepo) | ![downloads](https://img.shields.io/npm/dm/eslint-plugin-vercel-ai-security?style=flat-square&label=)  |
| [`eslint-plugin-mongodb-security`](https://www.npmjs.com/package/eslint-plugin-mongodb-security)       |    16 | Detects NoSQL operator injection, unsafe queries and regex, hardcoded connection strings, and missing TLS                                                                                                                                   | [docs](https://eslint.interlace.tools/docs/security/plugin-mongodb-security?utm_source=github&utm_medium=referral&utm_campaign=monorepo)   | ![downloads](https://img.shields.io/npm/dm/eslint-plugin-mongodb-security?style=flat-square&label=)    |
| [`eslint-plugin-jwt-security`](https://www.npmjs.com/package/eslint-plugin-jwt-security)               |    13 | Detects algorithm confusion (CVE-2022-23540), alg:none, weak or hardcoded secrets, and decode-without-verify                                                                                                                                | [docs](https://eslint.interlace.tools/docs/security/plugin-jwt?utm_source=github&utm_medium=referral&utm_campaign=monorepo)                | ![downloads](https://img.shields.io/npm/dm/eslint-plugin-jwt-security?style=flat-square&label=)        |
| [`eslint-plugin-postgresql-security`](https://www.npmjs.com/package/eslint-plugin-postgresql-security) |    13 | Detects SQL injection, unreleased clients, floating queries, unsafe search_path, and insecure SSL                                                                                                                                           | [docs](https://eslint.interlace.tools/docs/security/plugin-pg?utm_source=github&utm_medium=referral&utm_campaign=monorepo)                 | ![downloads](https://img.shields.io/npm/dm/eslint-plugin-postgresql-security?style=flat-square&label=) |
| [`eslint-plugin-knex-security`](https://www.npmjs.com/package/eslint-plugin-knex-security)             |     5 | Detects SQL injection in raw queries built with string concatenation or template literals, connection configuration that disables TLS or certificate validation, and hardcoded database credentials                                         | [docs](https://eslint.interlace.tools/docs/security/plugin-knex-security?utm_source=github&utm_medium=referral&utm_campaign=monorepo)      | ![downloads](https://img.shields.io/npm/dm/eslint-plugin-knex-security?style=flat-square&label=)       |
| [`eslint-plugin-drizzle-security`](https://www.npmjs.com/package/eslint-plugin-drizzle-security)       |     4 | Detects SQL injection in raw queries built with string concatenation or template literals                                                                                                                                                   | [docs](https://eslint.interlace.tools/docs/security/plugin-drizzle-security?utm_source=github&utm_medium=referral&utm_campaign=monorepo)   | ![downloads](https://img.shields.io/npm/dm/eslint-plugin-drizzle-security?style=flat-square&label=)    |
| [`eslint-plugin-mcp-sdk-security`](https://www.npmjs.com/package/eslint-plugin-mcp-sdk-security)       |     4 | Catches tools registered without an input schema, handlers reading arguments the schema never declared, model-visible descriptions built from dynamic text, and tool arguments reaching a shell                                             | [readme](./packages/eslint-plugin-mcp-sdk-security)                                                                                        | ![downloads](https://img.shields.io/npm/dm/eslint-plugin-mcp-sdk-security?style=flat-square&label=)    |
| [`eslint-plugin-prisma-security`](https://www.npmjs.com/package/eslint-plugin-prisma-security)         |     4 | Detects SQL injection in raw queries built with string concatenation or template literals                                                                                                                                                   | [docs](https://eslint.interlace.tools/docs/security/plugin-prisma-security?utm_source=github&utm_medium=referral&utm_campaign=monorepo)    | ![downloads](https://img.shields.io/npm/dm/eslint-plugin-prisma-security?style=flat-square&label=)     |
| [`eslint-plugin-sequelize-security`](https://www.npmjs.com/package/eslint-plugin-sequelize-security)   |     4 | Detects SQL injection in raw sequelize.query() and Sequelize.literal() calls built with string concatenation or template literals, connection configuration that disables TLS or certificate validation, and hardcoded database credentials | [docs](https://eslint.interlace.tools/docs/security/plugin-sequelize-security?utm_source=github&utm_medium=referral&utm_campaign=monorepo) | ![downloads](https://img.shields.io/npm/dm/eslint-plugin-sequelize-security?style=flat-square&label=)  |
| [`eslint-plugin-typeorm-security`](https://www.npmjs.com/package/eslint-plugin-typeorm-security)       |     4 | Detects SQL injection in raw queries built with string concatenation or template literals, connection configuration that disables TLS or certificate validation, and hardcoded database credentials                                         | [docs](https://eslint.interlace.tools/docs/security/plugin-typeorm-security?utm_source=github&utm_medium=referral&utm_campaign=monorepo)   | ![downloads](https://img.shields.io/npm/dm/eslint-plugin-typeorm-security?style=flat-square&label=)    |
| [`eslint-plugin-anthropic-security`](https://www.npmjs.com/package/eslint-plugin-anthropic-security)   |     3 | Catches hardcoded Claude API keys, the browser escape hatch that ships them to every visitor, and system prompts assembled from untrusted input                                                                                             | [readme](./packages/eslint-plugin-anthropic-security)                                                                                      | ![downloads](https://img.shields.io/npm/dm/eslint-plugin-anthropic-security?style=flat-square&label=)  |
| [`eslint-plugin-gemini-security`](https://www.npmjs.com/package/eslint-plugin-gemini-security)         |     3 | Catches safety thresholds set to BLOCK_NONE, hardcoded API keys, and system instructions assembled from untrusted input                                                                                                                     | [readme](./packages/eslint-plugin-gemini-security)                                                                                         | ![downloads](https://img.shields.io/npm/dm/eslint-plugin-gemini-security?style=flat-square&label=)     |
| [`eslint-plugin-mysql-security`](https://www.npmjs.com/package/eslint-plugin-mysql-security)           |     3 | Detects SQL injection in raw queries built with string concatenation or template literals, connection configuration that disables TLS or certificate validation, and hardcoded database credentials                                         | [docs](https://eslint.interlace.tools/docs/security/plugin-mysql-security?utm_source=github&utm_medium=referral&utm_campaign=monorepo)     | ![downloads](https://img.shields.io/npm/dm/eslint-plugin-mysql-security?style=flat-square&label=)      |
| [`eslint-plugin-openai-security`](https://www.npmjs.com/package/eslint-plugin-openai-security)         |     3 | Catches dangerouslyAllowBrowser, hardcoded API keys, and system prompts assembled from untrusted input                                                                                                                                      | [readme](./packages/eslint-plugin-openai-security)                                                                                         | ![downloads](https://img.shields.io/npm/dm/eslint-plugin-openai-security?style=flat-square&label=)     |
| [`eslint-plugin-sqlite-security`](https://www.npmjs.com/package/eslint-plugin-sqlite-security)         |     1 | Detects SQL injection in raw queries built with string concatenation or template literals                                                                                                                                                   | [docs](https://eslint.interlace.tools/docs/security/plugin-sqlite-security?utm_source=github&utm_medium=referral&utm_campaign=monorepo)    | ![downloads](https://img.shields.io/npm/dm/eslint-plugin-sqlite-security?style=flat-square&label=)     |

### 🏗️ Security — application frameworks

<sub>3 plugins · 51 rules</sub>

| Package                                                                                          | Rules | What it catches                                                                                                                     | Docs                                                                                                                                     | Downloads                                                                                           |
| :----------------------------------------------------------------------------------------------- | ----: | :---------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------- |
| [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security) |    28 | Detects permissive CORS, missing CSRF protection, missing helmet headers, insecure cookies, and GraphQL introspection in production | [docs](https://eslint.interlace.tools/docs/security/plugin-express-security?utm_source=github&utm_medium=referral&utm_campaign=monorepo) | ![downloads](https://img.shields.io/npm/dm/eslint-plugin-express-security?style=flat-square&label=) |
| [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security)   |    14 | Detects overly permissive IAM policies and CORS, unvalidated event bodies, secrets in env vars, and leaked error details            | [docs](https://eslint.interlace.tools/docs/security/plugin-lambda-security?utm_source=github&utm_medium=referral&utm_campaign=monorepo)  | ![downloads](https://img.shields.io/npm/dm/eslint-plugin-lambda-security?style=flat-square&label=)  |
| [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security)   |     9 | Detects missing auth guards, missing validation pipes, unthrottled routes, and exposed private fields                               | [docs](https://eslint.interlace.tools/docs/security/plugin-nestjs-security?utm_source=github&utm_medium=referral&utm_campaign=monorepo)  | ![downloads](https://img.shields.io/npm/dm/eslint-plugin-nestjs-security?style=flat-square&label=)  |

### 🧭 Architecture

<sub>1 plugin · 55 rules</sub>

| Package                                                                                | Rules | What it catches                                                                             | Docs                                                                                                                               | Downloads                                                                                      |
| :------------------------------------------------------------------------------------- | ----: | :------------------------------------------------------------------------------------------ | :--------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------- |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next) |    55 | Drop-in replacement for eslint-plugin-import, 3.1x faster end-to-end, zero-config migration | [docs](https://eslint.interlace.tools/docs/quality/plugin-import-next?utm_source=github&utm_medium=referral&utm_campaign=monorepo) | ![downloads](https://img.shields.io/npm/dm/eslint-plugin-import-next?style=flat-square&label=) |

### ✨ Code quality

<sub>6 plugins · 52 rules</sub>

| Package                                                                                        | Rules | What it catches                                                                                                   | Docs                                                                                                                                   | Downloads                                                                                          |
| :--------------------------------------------------------------------------------------------- | ----: | :---------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------- |
| [`eslint-plugin-conventions`](https://www.npmjs.com/package/eslint-plugin-conventions)         |    15 | Enforces filename case, magic-number bans, commented-out code, expiring TODOs, and deprecated-API usage           | [docs](https://eslint.interlace.tools/docs/quality/plugin-conventions?utm_source=github&utm_medium=referral&utm_campaign=monorepo)     | ![downloads](https://img.shields.io/npm/dm/eslint-plugin-conventions?style=flat-square&label=)     |
| [`eslint-plugin-maintainability`](https://www.npmjs.com/package/eslint-plugin-maintainability) |    12 | Limits cognitive complexity, nesting depth, parameter counts, duplicate functions, and unhandled or silent errors | [docs](https://eslint.interlace.tools/docs/quality/plugin-maintainability?utm_source=github&utm_medium=referral&utm_campaign=monorepo) | ![downloads](https://img.shields.io/npm/dm/eslint-plugin-maintainability?style=flat-square&label=) |
| [`eslint-plugin-reliability`](https://www.npmjs.com/package/eslint-plugin-reliability)         |     9 | Enforces error handling, network timeouts, null checks, and safe type narrowing                                   | [docs](https://eslint.interlace.tools/docs/quality/plugin-reliability?utm_source=github&utm_medium=referral&utm_campaign=monorepo)     | ![downloads](https://img.shields.io/npm/dm/eslint-plugin-reliability?style=flat-square&label=)     |
| [`eslint-plugin-modularity`](https://www.npmjs.com/package/eslint-plugin-modularity)           |     6 | Enforces DDD value objects and anemic-model checks, naming, REST conventions, and utility isolation               | [docs](https://eslint.interlace.tools/docs/quality/plugin-modularity?utm_source=github&utm_medium=referral&utm_campaign=monorepo)      | ![downloads](https://img.shields.io/npm/dm/eslint-plugin-modularity?style=flat-square&label=)      |
| [`eslint-plugin-operability`](https://www.npmjs.com/package/eslint-plugin-operability)         |     6 | Bans debug code and console logging in production, verbose error messages, and process.exit calls                 | [docs](https://eslint.interlace.tools/docs/quality/plugin-operability?utm_source=github&utm_medium=referral&utm_campaign=monorepo)     | ![downloads](https://img.shields.io/npm/dm/eslint-plugin-operability?style=flat-square&label=)     |
| [`eslint-plugin-modernization`](https://www.npmjs.com/package/eslint-plugin-modernization)     |     4 | Auto-fixes legacy patterns to ES2022+ (Array.at, template literals, EventTarget, Array.isArray)                   | [docs](https://eslint.interlace.tools/docs/quality/plugin-modernization?utm_source=github&utm_medium=referral&utm_campaign=monorepo)   | ![downloads](https://img.shields.io/npm/dm/eslint-plugin-modernization?style=flat-square&label=)   |

### ⚛️ React

<sub>2 plugins · 98 rules</sub>

| Package                                                                                      | Rules | What it catches                                                                                                       | Docs                                                                                                                                  | Downloads                                                                                         |
| :------------------------------------------------------------------------------------------- | ----: | :-------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------ |
| [`eslint-plugin-react-features`](https://www.npmjs.com/package/eslint-plugin-react-features) |    61 | Hooks, prop-types, JSX correctness, render performance, and class-to-hooks migration rules for modern React codebases | [docs](https://eslint.interlace.tools/docs/quality/plugin-react-features?utm_source=github&utm_medium=referral&utm_campaign=monorepo) | ![downloads](https://img.shields.io/npm/dm/eslint-plugin-react-features?style=flat-square&label=) |
| [`eslint-plugin-react-a11y`](https://www.npmjs.com/package/eslint-plugin-react-a11y)         |    37 | WCAG 2.1 rules for ARIA, alt text, keyboard interaction, and focus management, with auto-fixes                        | [docs](https://eslint.interlace.tools/docs/quality/plugin-react-a11y?utm_source=github&utm_medium=referral&utm_campaign=monorepo)     | ![downloads](https://img.shields.io/npm/dm/eslint-plugin-react-a11y?style=flat-square&label=)     |

<!-- AUTO-GENERATED:PACKAGE_TABLE:END -->

### Supporting tools

| Package                                                                              | What it does                                                                                                          |
| :----------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------- |
| [`@interlace/eslint-devkit`](https://www.npmjs.com/package/@interlace/eslint-devkit) | Build your own team-specific rules — AST helpers, typed rule creator, and the LLM message formatter these plugins use |

> The table and counts above are generated from the source tree by
> `npm run sync:root-readme`, and CI fails if this file drifts from it. The
> canonical counts contract is
> [`interlace-numbers.json`](./apps/docs/src/data/interlace-numbers.json).

---

## Why an independent ecosystem?

Every rule here is a **clean-room implementation** — familiar naming, different engineering.

|                               | What that buys you                                                                                                               |
| :---------------------------- | :------------------------------------------------------------------------------------------------------------------------------- |
| 🚀 **No upstream queue**      | A CVE lands, a rule ships. We measure that latency ourselves — [`cve-rule-latency.md`](./benchmark-results/cve-rule-latency.md)  |
| 🤖 **AI-optimized messages**  | CWE + CVSS + OWASP + compliance tags inside the message body, where the model actually reads them                                |
| ⚡ **One codebase**           | Shared AST utilities, shared perf budget, [one per-rule latency gate](./.github/workflows/per-rule-budget.yml) across every rule |
| 🏗️ **Consistent surface**     | Same preset names, same option shapes, same docs layout in every plugin                                                          |
| 📚 **Educational by default** | Each message explains _why_, not just _what_ — the guardrail teaches on the way past                                             |
| 🔧 **Modern flat config**     | ESLint 8.40 / 9 / 10, plus an [oxlint parity gate](./.github/workflows/oxlint-parity.yml) for the rules oxlint can run natively  |

**The deeper case** — why any of this is worth money:

- [`cicd-impact/value-philosophy.md`](cicd-impact/value-philosophy.md) — what value is, the two ruling systems (capitalism + humanism), and the unbroken chain from human incentives down to a single ESLint rule.
- [`cicd-impact/philosophy.md`](cicd-impact/philosophy.md) — how CI/CD friction expresses itself along money, velocity, and deliverability.
- [`cicd-impact/`](cicd-impact/) — a forkable calculator that turns that into a `$/CI-minute` figure for any GitHub Actions repo.

---

## How we measure quality (FP / FN / TP / TN)

Every finding is one of four things, and we track all four — per rule, per CWE, per OSS repo:

|                 | **Code IS vulnerable** | **Code is clean**      |
| :-------------- | :--------------------- | :--------------------- |
| **Rule fires**  | **TP** — signal        | **FP** — noise         |
| **Rule silent** | **FN** — miss          | **TN** — correct quiet |

- **Precision** = TP / (TP + FP) — of what we flag, how much is real?
- **Recall** = TP / (TP + FN) — of what we should flag, how much did we catch?
- **F1** — the harmonic mean, so neither can be gamed alone.

**Recall first, precision second.** A missed CWE is worse than a noisy rule, and we
don't regress recall to chase FPs.

On the [ILB-Arena](./benchmarks/README.md) corpus (40 vulnerable / 38 safe fixtures,
18 plugins scored, 17 security-relevant) Interlace ranks **1st**; the next-best
plugin scores **66.1% F1**. We publish the _ordinal_ result and not the absolute
one on purpose — a perfect score on a self-authored 40-fixture corpus is a
regression test wearing a benchmark's clothes, and we
[withdrew our own headline number](./CLAIMS.md) when an audit found it unsupported
by its own evidence file.

That is what [**CLAIMS.md**](./CLAIMS.md) is for: every marketing claim in this repo
maps to the evidence file that produced it, carries a verification date, goes
**stale after 90 days**, and is withdrawn in public when it doesn't hold.
`npm run audit:claims` fails the build if a withdrawn claim reappears anywhere.

---

## Performance — cold cache vs. warm cache

Latency is measured per rule on real OSS repos (next.js, supabase, lodash, vercel-ai,
payload, shadcn-ui, three.js…) in both **cold** (`--no-cache`) and **warm**
(`--cache`, second consecutive run) profiles. From the
[latest flagship scorecard](./benchmark-results/ilb-flagship-scorecard.md)
(ESLint 9.39.4 · oxlint 1.63.0 · Node 24.13.0):

| Stack               | Median cold | Median warm |        Δ | Cache benefit |
| :------------------ | ----------: | ----------: | -------: | ------------: |
| **Ours (ESLint)**   |    9,966 ms |      429 ms | 9,537 ms |       **96%** |
| Competitor (ESLint) |    4,843 ms |      410 ms | 4,433 ms |           92% |
| oxlint native       |       87 ms |       86 ms |     1 ms |            1% |

**The honest read:** cold, we are slower than the competitor plugins we replace — we
do more analysis per file. Warm, that gap closes to ~19 ms of median difference and
the cache absorbs 96% of our cost. If you haven't enabled it, you're paying ~23×
more per lint run than you need to:

```bash
eslint --cache --cache-location node_modules/.cache/eslint .
```

oxlint stays ~5× faster warm than either ESLint stack. That's a real result and we
publish it rather than hide it — it's also why the
[oxlint parity gate](./.github/workflows/oxlint-parity.yml) exists.

### How we benchmark the benchmark

- **Frozen corpus per bench version** — [`npm run ilb:corpus-integrity`](./scripts/ilb-corpus-integrity.ts) is a CI gate, because silent commit drift in the corpus invalidates every prior number.
- **Append-only history** in [`benchmark-results/history.ndjson`](./benchmark-results/history.ndjson), so any figure can be plotted over time.
- **Detection parity is checked before timing is trusted** — a crashed run exits early, and timing a crash would score it as a win.
- **Cross-version matrix** against ESLint 8 / 9 / 10 on every PR ([`eslint-version-matrix.yml`](./.github/workflows/eslint-version-matrix.yml)).

Run it yourself: `npm run ilb:scorecard`. Vocabulary contract and the ten principles
are in [`benchmarks/README.md`](./benchmarks/README.md).

---

## Compatibility

### ESLint

> **Last refresh:** 2026-08-02 (source: npm registry — `npm run stats:eslint-versions`)

| ESLint major    | Weekly downloads |  Share | Status                         |
| :-------------- | ---------------: | -----: | :----------------------------- |
| **v10**         |            23.6M | 11.08% | ✅ Supported (forward-looking) |
| **v9**          |           109.1M | 51.13% | ✅ Supported (current default) |
| **v8** (≥ 8.40) |            60.3M | 28.29% | ✅ Supported (legacy active)   |
| v7 and older    |            20.3M |  9.51% | ❌ Unsupported (EOL)           |

Supported majors cover **90.49%** of weekly ESLint downloads. Every published package
declares `"eslint": "^8.40.0 || ^9.0.0 || ^10.0.0"`.

**Why the floor is 8.40 and not 8.0:** releases before 8.40 predate
`context.sourceCode` / `context.filename`, which this repo reads at 333 call sites.
Measured on `eslint-plugin-nestjs-security@2.1.0`, ESLint 8.0.0 and 8.39.0 throw on
load and 8.40.0 works — so the range now states the oldest minor the rules actually
run on ([#407](https://github.com/ofri-peretz/eslint/pull/407)).

**When a major gets supported:** either it holds ≥20% of weekly npm downloads, or it
is the next major after a currently-supported one (we ship support pre-emptively so
you can upgrade ahead of the curve, not behind it). A major is dropped only after two
consecutive refreshes below the gate _and_ a supported successor exists. Full policy:
[docs/ESLINT_VERSION_SUPPORT.md](./docs/ESLINT_VERSION_SUPPORT.md).

### Node.js

| Node.js      | Status                                                              |
| :----------- | :------------------------------------------------------------------ |
| **24.x**     | ✅ Active development — the repo's `engines.node` pin, what CI runs |
| **22.x LTS** | ✅ Supported — recommended for production                           |
| **20.x LTS** | ✅ Supported — long-term-stable baseline                            |
| **18.x**     | ✅ Supported (minimum) — every package's `engines.node: ">=18.0.0"` |
| ≤ 17         | ❌ Unsupported (EOL upstream)                                       |

---

## Who this is for

| Role                       | What it does for you                                                                                               |
| :------------------------- | :----------------------------------------------------------------------------------------------------------------- |
| **Security engineers**     | Catch CWEs at edit time with CVSS + OWASP already attached, and export SARIF into GitHub code scanning             |
| **Tech leads**             | Enforce architectural decisions automatically instead of re-litigating them in review                              |
| **Platform teams**         | One guardrail set that scales across repos, with a per-rule latency budget so CI doesn't pay for it                |
| **Teams shipping with AI** | Messages an LLM can act on correctly — the difference between "fixed the lint error" and "fixed the vulnerability" |
| **Engineering managers**   | New engineers learn the codebase through guardrails, not tribal knowledge                                          |

---

## Contributing & security

- 💡 **Have an idea?** [Start a discussion](https://github.com/ofri-peretz/eslint/discussions)
- 🐛 **Found a bug?** [Open an issue](https://github.com/ofri-peretz/eslint/issues) — a false positive _is_ a bug here, and it's the bug we most want to hear about
- 🛠️ **Want to contribute?** [CONTRIBUTING.md](./CONTRIBUTING.md) · [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) · [GOVERNANCE.md](./GOVERNANCE.md) · [ARCHITECTURE.md](./ARCHITECTURE.md)
- 🔒 **Found a vulnerability?** Don't open a public issue — [SECURITY.md](./SECURITY.md) has the private disclosure path

Also worth reading: [ROADMAP.md](./ROADMAP.md) for what's next, and
[AGENTS.md](./AGENTS.md) / [CLAUDE.md](./CLAUDE.md) if you're pointing an AI agent at
this repo.

---

## Links

|                     |                                                                                                                       |
| :------------------ | :-------------------------------------------------------------------------------------------------------------------- |
| 📚 **Docs**         | [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=monorepo) |
| 📦 **npm**          | [All Interlace packages](https://www.npmjs.com/search?q=eslint-plugin%20interlace)                                    |
| 📊 **Live metrics** | [ofriperetz.dev/stats](https://ofriperetz.dev/stats?utm_source=github&utm_medium=referral&utm_campaign=monorepo)      |
| ✍️ **Writeups**     | [dev.to/ofri-peretz](https://dev.to/ofri-peretz)                                                                      |

---

## License

MIT © [Ofri Peretz](https://github.com/ofri-peretz) — see [LICENSE](LICENSE).

<p align="center">
  <a href="https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=monorepo" target="_blank"><img src="https://eslint.interlace.tools/logos/interlace.svg" alt="Interlace" height="70" /></a>
</p>
<p align="center">
  <sub>Made with ❤️ from lessons learned in the trenches</sub>
</p>
