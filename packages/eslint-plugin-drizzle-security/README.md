<p align="center">
  <a href="https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-drizzle-security" target="blank"><img src="https://eslint.interlace.tools/logos/interlace.svg" alt="Interlace" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://orm.drizzle.team" target="_blank"><img src="https://eslint.interlace.tools/logos/drizzle.svg" alt="Drizzle ORM" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://oxc.rs" target="_blank"><img src="https://eslint.interlace.tools/logos/oxlint.svg" alt="oxlint" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://eslint.org" target="_blank"><img src="https://eslint.interlace.tools/logos/eslint.svg" alt="ESLint" height="90" /></a>
</p>

<p align="center">
  Security rules for drizzle-orm (SQL injection prevention in raw queries).
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-drizzle-security" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-drizzle-security.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-drizzle-security" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-drizzle-security.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=eslint-plugin-drizzle-security" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=eslint-plugin-drizzle-security" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/ofri-peretz/eslint" target="_blank"><img src="https://api.securityscorecards.dev/projects/github.com/ofri-peretz/eslint/badge" alt="OpenSSF Scorecard" /></a>
</p>

> ⭐ If this plugin caught a real bug for you, [**star the repo**](https://github.com/ofri-peretz/eslint) — it's the signal that keeps these rules maintained.

## Description

This plugin provides Security rules for drizzle-orm (SQL injection prevention in raw queries).

## Why Drizzle-specific?

Being Drizzle-specific is what makes the rule precise. It knows which calls are raw-SQL sinks (`.raw()`) and which idioms are already safe, so it reports the patterns that actually lead to injection and stays quiet on parameterized queries. It also tracks variable taint across statements, so a query built on one line and executed on another is still reported.

The detection itself is shared with the other Interlace driver plugins through `createSqlInjectionRule` — install the one matching your stack and you get exactly one finding per line.

## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

<!-- AUTO-GENERATED:DOCTRINE:START - Do not edit manually -->

## Why these rules are quiet

**Noise creates apathy, and apathy is not a security posture.** A linter that reports
a thousand things a week gets switched off in a month, and the real finding goes with
it. So every rule here is built to be worth reading: we would rather miss a finding
than spend your attention on one that was never real.

That is a trade, and it is made deliberately. It costs recall, and we measure what it
costs rather than assuming it is free.

## How the rules decide

**Evidence, not names.** A rule fires on what the code *does*, resolved through the
AST and ESLint's own scope analysis — not on an identifier that happens to contain
`query`, a method called `setItem`, or a file whose path contains `key`. Every one of
those was a real false positive in this ecosystem, found by reading our own output on
open-source projects and fixed with a test that fails on the unfixed rule.

Where a rule has known false-positive shapes, its page carries a **Not a finding**
section: what it deliberately stays quiet on, and what to check first when it fires
and you disagree.

## What you get

The rules below, with a CWE mapping, a CVSS score and a fix on every message — in
prose for a human and as structured JSON for an agent. Install it, enable
`recommended`, and read the findings. If one of them is wrong,
[open an issue](https://github.com/ofri-peretz/eslint/issues) — a false positive is a
bug here, not a tuning exercise for you.

How that is measured, on which projects, and where it falls short:
[benchmark methodology](https://github.com/ofri-peretz/eslint/blob/main/BENCHMARK-METHODOLOGY.md)
and [results](https://github.com/ofri-peretz/eslint/blob/main/BENCHMARK-RESULTS.md).

<!-- AUTO-GENERATED:DOCTRINE:END -->

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/security/plugin-drizzle-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-drizzle-security), visit [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-drizzle-security). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/security/plugin-drizzle-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-drizzle-security), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-drizzle-security). 📚
- [가이드](https://eslint.interlace.tools/docs/security/plugin-drizzle-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-drizzle-security) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-drizzle-security)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/security/plugin-drizzle-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-drizzle-security)は [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-drizzle-security)でご確認ください。 📚
- Para ver la [guía](https://eslint.interlace.tools/docs/security/plugin-drizzle-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-drizzle-security), visita [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-drizzle-security). 📚
- للاطلاع على [الدليل](https://eslint.interlace.tools/docs/security/plugin-drizzle-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-drizzle-security)، قم بزيارة [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-drizzle-security). 📚

```bash
npm install eslint-plugin-drizzle-security --save-dev
```

## ⚙️ Configuration Presets
| Preset        | Description                                              |
| :------------ | :------------------------------------------------------- |
| `recommended` | Recommended preset - balanced security for most projects |
| `strict`      | Strict preset - all rules as errors                      |
| `flagship`    | Highest-signal rules only, for CI gates                  |

## 📚 Supported Libraries
| Library | npm | Downloads | Detection |
| ------- | --- | --------- | --------- |
| `drizzle-orm` | [![npm](https://img.shields.io/npm/v/drizzle-orm.svg?style=flat-square)](https://www.npmjs.com/package/drizzle-orm) | [![downloads](https://img.shields.io/npm/dt/drizzle-orm.svg?style=flat-square)](https://www.npmjs.com/package/drizzle-orm) | SQL Injection |

### Custom Configuration

```javascript
import drizzle from 'eslint-plugin-drizzle-security';

export default [
  {
    plugins: { 'sequelize-security': sequelizeSecurity },
    rules: {
      'drizzle-security/no-unsafe-query': 'error',
    },
  },
];
```

## 💡 What You Get
- **Covers the escapes your ORM leaves open:** `.raw()`
- **Drizzle's own remediation:** every finding names Drizzle's own safe API, not a generic "use parameterized queries"
- **Cross-statement taint tracking:** catches queries assembled over several lines, including with `+=`
- **Quiet on safe code:** parameterized queries, static SQL and builder calls do not report
- **LLM-optimized messages:** structured 2-line errors with CWE + fixes that AI assistants can apply

Every rule produces a **structured error message**:

```bash
src/db.ts
  42:15  error  🔒 CWE-89 OWASP:A03-Injection CVSS:9.8 | Unsafe SQL query construction detected (template literal) | CRITICAL
                    Fix: Use the `sql` tagged template, which parameterizes interpolated values, instead of `sql.raw()`.
```

## 📦 Compatibility
| Package | Version |
| :--- | :--- |
| ESLint | `^8.40.0 \|\| ^9.0.0 \|\| ^10.0.0` |
| Node.js | `>=18.0.0` |

See the [ESLint Version Support Policy](../../docs/ESLINT_VERSION_SUPPORT.md) — current ecosystem share data, the 20% gate, and the forward-looking exception that covers v10.

## Rules

**Legend**

| Icon | Description |
| :---: | :--- |
| 💼 | **Recommended**: Included in the recommended preset. |
| ⚠️ | **Warns**: Set to warn in recommended preset. |
| 🔧 | **Auto-fixable**: Automatically fixable by the `--fix` CLI option. |
| 💡 | **Suggestions**: Providing code suggestions in IDE. |
| 🚫 | **Deprecated**: This rule is deprecated. |
| 🟢 | **Type-unaware**: AST-only, runs in oxlint JS-plugin tier. |
| 🟡 | **Type-aware (refining)**: pure-AST primary path; types refine precision. |
| 🟠 | **Type-aware (graceful)**: requires TS program; silent without it. |

<!-- AUTO-GENERATED:RULES_TABLE:START - Do not edit manually -->
| Rule | CWE | OWASP | CVSS | Description | 🧠 | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| [no-mass-assignment](https://eslint.interlace.tools/docs/security/plugin-drizzle-security/rules/no-mass-assignment?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-drizzle-security) | CWE-915 | A04:2021 |  | Disallow writing an inbound request object straight to the database through Drizzle, which lets the caller… | 🟢 |  |  |  |  |  |
| [no-raw-identifier-interpolation](https://eslint.interlace.tools/docs/security/plugin-drizzle-security/rules/no-raw-identifier-interpolation?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-drizzle-security) | CWE-89 | A03:2021 |  | Disallow interpolating table, column or sort identifiers into a Drizzle `sql` tagged template, where bind p… | 🟢 |  |  |  |  |  |
| [no-unsafe-query](https://eslint.interlace.tools/docs/security/plugin-drizzle-security/rules/no-unsafe-query?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-drizzle-security) | CWE-89 | A03:2021 |  | Prevent SQL injection by disallowing string concatenation or interpolated template literals in Drizzle sql.… | 🟢 | 💼 |  |  |  |  |
| [no-unscoped-mutation](https://eslint.interlace.tools/docs/security/plugin-drizzle-security/rules/no-unscoped-mutation?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-drizzle-security) | CWE-284 | A01:2021 |  | Require a chained `.where()` on Drizzle delete and update builders, so a bulk mutation cannot rewrite or de… | 🟢 |  |  |  |  |  |
<!-- AUTO-GENERATED:RULES_TABLE:END -->
## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint Ecosystem** — AI-native security plugins with LLM-optimized error messages:

| Plugin | Downloads | Description |
| :--- | :---: | :--- |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-secure-coding.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-secure-coding) | General security rules & OWASP guidelines. |
| [`eslint-plugin-pg`](https://www.npmjs.com/package/eslint-plugin-pg) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-pg.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-pg) | PostgreSQL security & best practices. |
| [`eslint-plugin-node-security`](https://www.npmjs.com/package/eslint-plugin-node-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-node-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-node-security) | Node.js core-module security (fs, child_process, vm, crypto, Buffer). |
| [`eslint-plugin-jwt`](https://www.npmjs.com/package/eslint-plugin-jwt) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-jwt.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-jwt) | JWT security & best practices. |
| [`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-browser-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-browser-security) | Browser-specific security & XSS prevention. |
| [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-express-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-express-security) | Express.js security hardening rules. |
| [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-lambda-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-lambda-security) | AWS Lambda security best practices. |
| [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-nestjs-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | NestJS security rules & patterns. |
| [`eslint-plugin-mongodb-security`](https://www.npmjs.com/package/eslint-plugin-mongodb-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-mongodb-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-mongodb-security) | MongoDB security best practices. |
| [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-vercel-ai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | Vercel AI SDK security hardening. |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-import-next.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import-next) | Next-gen import sorting & architecture. |

<!-- INTERLACE:STAR_CTA:START -->
## ⭐ Support & follow

If this plugin caught a real bug for you, **[star the repo](https://github.com/ofri-peretz/eslint)** — stars are the signal that keeps the Interlace ESLint ecosystem maintained — and **[follow the writeups on Dev.to](https://dev.to/ofri-peretz)** for the benchmarks and security research behind these rules.

[![GitHub stars](https://img.shields.io/github/stars/ofri-peretz/eslint?style=social)](https://github.com/ofri-peretz/eslint)

<!-- INTERLACE:STAR_CTA:END -->

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-drizzle-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-drizzle-security"><img src="https://eslint.interlace.tools/images/og-drizzle-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>

<p align="center">
  <a href="https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-drizzle-security" target="blank"><img src="https://eslint.interlace.tools/icon-light.svg" alt="Interlace" height="70" /></a>
</p>
