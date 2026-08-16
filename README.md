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
  Every finding ships with a CWE, an OWASP mapping, and the fix.
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
  <a href="https://eslint.interlace.tools/articles?utm_source=github&utm_medium=referral&utm_campaign=monorepo">📨 Follow the writeups</a> &nbsp;·&nbsp;
  <a href="https://eslint.interlace.tools/stats?utm_source=github&utm_medium=referral&utm_campaign=monorepo">📊 Live metrics</a>
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

**Signal over noise.** A rule that fires two thousand times to be right four hundred of
them does not make a codebase safer — it teaches the team to skip the category, and an
ignored tool has zero recall regardless of what it detects.

This is a constraint we hold against ourselves. `no-unsafe-regex-construction` has a real
~300-file recall gap: competitors catch `new RegExp(userSuppliedName)` and we do not. We
built the fix and measured it before shipping — findings went **29 → 2,243** on the same
corpus, and a hand-read of the new ones put precision at **~25%**. We reverted it, and
[documented the gap](./BENCHMARK-RESULTS.md) rather than closing it badly.

### The same corpus, six plugins, one command

Every community ESLint security plugin, scored on identical labelled fixtures from
`benchmarks/corpus/` — **our own CWE corpus, not NIST Juliet**; the suite that scores it was
[renamed for exactly that reason](./CLAIMS.md):

| Plugin | TP | FP | FN | F1 |
| :----- | -: | -: | -: | -: |
| **Interlace** | **69** | **0** | **0** | **100%** |
| eslint-plugin-sonarjs | 27 | 9 | 42 | 51.4% |
| eslint-plugin-security | 10 | 7 | 59 | 23.3% |
| @microsoft/eslint-plugin-sdl | 6 | 2 | 63 | 15.6% |
| eslint-plugin-no-unsanitized | 4 | 1 | 65 | 10.8% |
| eslint-plugin-security-node | 4 | 3 | 65 | 10.5% |

Read that with the caveat attached: **the fixtures are ours**, so a perfect score there is
a regression gate wearing a benchmark's clothes. The number that survives contact with code
we did not write is the away-turf one — **51/51 live cases on `eslint-plugin-security`'s own
RuleTester suite**, which they wrote to define their own true positives.

And on 20 open-source projects (23,682 files, 2.37M SLOC), sampled and hand-labelled on both
sides:

| | Interlace | eslint-plugin-security |
| :-- | --: | --: |
| Findings | 1,283 | 23,325 |
| Measured precision | **67%** | 20% |
| Findings you read per real issue | **1.5** | 5.0 |

They still find more real issues in absolute terms, because they fire 18× more often. Our
precision moved 47% → 67% on 2026-08-14 by deleting name-matching, not by adding analysis —
`no-xpath-injection` reported a Zod schema, `no-improper-sanitization` treated a pipe as
unescaped HTML, and `no-http-urls` reported the guard that checks for `http://`. Each fix is
measured before and after in [BENCHMARK-RESULTS.md](./BENCHMARK-RESULTS.md).

### What this is not

- **Not SAST.** No inter-procedural dataflow, no cross-file taint, no build integration, no
  SBOM, no secret-history scanning. That is a different product at a different price.
- **75 CWEs**, of roughly 900 — the ones an AST can see.
- **"Quieter" is measured against `eslint-plugin-security`.** Against a narrow
  single-purpose plugin such as `eslint-plugin-no-unsanitized` we report *more*, and we say so.

[Full results](./BENCHMARK-RESULTS.md) · [Criteria](./BENCHMARK-CRITERIA.md) · [Methodology and exact rule lists](./BENCHMARK-METHODOLOGY.md) · [Raw data](./benchmarks/results/published/benchmark-2026-08-14.json)

That is what [**CLAIMS.md**](./CLAIMS.md) is for: every marketing claim in this repo
maps to the evidence file that produced it, carries a verification date, goes
**stale after 90 days**, and is withdrawn in public when it doesn't hold.
`npm run audit:claims` fails the build if a withdrawn claim reappears anywhere.

---

## Performance — measured weekly, not claimed

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

### How we benchmark the benchmark

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

## Design system

The UI in this repo's docs site is built on
**[Interlace](https://github.com/ofri-peretz/interlace)** — components and
tokens ship from `@interlace/ui`, and the look-and-feel doctrine (layout,
typography, colour, motion, a11y, keyboard, …) is authored there, not here.
Browse it at **[storybook.interlace.tools](https://storybook.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=monorepo)**
→ *Philosophy*, or read the sources in
[`docs/philosophies/`](https://github.com/ofri-peretz/interlace/tree/main/docs/philosophies).

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
