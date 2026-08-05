<p align="center">
  <a href="https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-typeorm-security" target="blank"><img src="https://eslint.interlace.tools/logos/interlace.svg" alt="Interlace" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://typeorm.io" target="_blank"><img src="https://eslint.interlace.tools/logos/typeorm.svg" alt="TypeORM" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://oxc.rs" target="_blank"><img src="https://eslint.interlace.tools/logos/oxlint.svg" alt="oxlint" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://eslint.org" target="_blank"><img src="https://eslint.interlace.tools/logos/eslint.svg" alt="ESLint" height="90" /></a>
</p>

<p align="center">
  Security rules for typeorm (SQL injection prevention in raw queries).
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-typeorm-security" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-typeorm-security.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-typeorm-security" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-typeorm-security.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=eslint-plugin-typeorm-security" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=eslint-plugin-typeorm-security" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
</p>

> ⭐ If this plugin caught a real bug for you, [**star the repo**](https://github.com/ofri-peretz/eslint) — it's the signal that keeps these rules maintained.

## Description

This plugin provides Security rules for typeorm (SQL injection prevention in raw queries).

## Why TypeORM-specific?

Being TypeORM-specific is what makes the rule precise. It knows which calls are raw-SQL sinks (`.query()`) and which idioms are already safe, so it reports the patterns that actually lead to injection and stays quiet on parameterized queries. It also tracks variable taint across statements, so a query built on one line and executed on another is still reported.

The detection itself is shared with the other Interlace driver plugins through `createSqlInjectionRule` — install the one matching your stack and you get exactly one finding per line.

## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/security/plugin-typeorm-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-typeorm-security), visit [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-typeorm-security). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/security/plugin-typeorm-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-typeorm-security), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-typeorm-security). 📚
- [가이드](https://eslint.interlace.tools/docs/security/plugin-typeorm-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-typeorm-security) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-typeorm-security)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/security/plugin-typeorm-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-typeorm-security)は [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-typeorm-security)でご確認ください。 📚
- Para ver la [guía](https://eslint.interlace.tools/docs/security/plugin-typeorm-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-typeorm-security), visita [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-typeorm-security). 📚
- للاطلاع على [الدليل](https://eslint.interlace.tools/docs/security/plugin-typeorm-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-typeorm-security)، قم بزيارة [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-typeorm-security). 📚

```bash
npm install eslint-plugin-typeorm-security --save-dev
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
| `typeorm` | [![npm](https://img.shields.io/npm/v/typeorm.svg?style=flat-square)](https://www.npmjs.com/package/typeorm) | [![downloads](https://img.shields.io/npm/dt/typeorm.svg?style=flat-square)](https://www.npmjs.com/package/typeorm) | SQL Injection |

### Custom Configuration

```javascript
import typeorm from 'eslint-plugin-typeorm-security';

export default [
  {
    plugins: { 'sequelize-security': sequelizeSecurity },
    rules: {
      'typeorm-security/no-unsafe-query': 'error',
    },
  },
];
```

## 💡 What You Get
- **Covers the escapes your ORM leaves open:** `.query()`
- **TypeORM's own remediation:** every finding names TypeORM's own safe API, not a generic "use parameterized queries"
- **Cross-statement taint tracking:** catches queries assembled over several lines, including with `+=`
- **Quiet on safe code:** parameterized queries, static SQL and builder calls do not report
- **LLM-optimized messages:** structured 2-line errors with CWE + fixes that AI assistants can apply

Every rule produces a **structured error message**:

```bash
src/db.ts
  42:15  error  🔒 CWE-89 OWASP:A03-Injection CVSS:9.8 | Unsafe SQL query construction detected (template literal) | CRITICAL
                    Fix: Pass values as the second-argument parameters array, or use query-builder parameters (`:name`), instead of interpolating them.
```

## 📦 Compatibility
| Package | Version |
| :--- | :--- |
| ESLint | `^8.0.0 \|\| ^9.0.0 \|\| ^10.0.0` |
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
| [no-hardcoded-credentials](https://eslint.interlace.tools/docs/security/plugin-typeorm-security/rules/no-hardcoded-credentials?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-typeorm-security) | CWE-798 | A07:2021 |  | Disallow literal database passwords in TypeORM connection configuration, including credentials embedded in… | 🟢 |  |  |  |  |  |
| [no-mass-assignment](https://eslint.interlace.tools/docs/security/plugin-typeorm-security/rules/no-mass-assignment?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-typeorm-security) | CWE-915 | A04:2021 |  | Disallow writing an inbound request object straight to the database through TypeORM, which lets the caller… | 🟢 |  |  |  |  |  |
| [no-unsafe-query](https://eslint.interlace.tools/docs/security/plugin-typeorm-security/rules/no-unsafe-query?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-typeorm-security) | CWE-89 | A03:2021 |  | Prevent SQL injection by disallowing string concatenation or interpolated template literals in TypeORM raw… | 🟢 | 💼 |  |  |  |  |
| [require-tls](https://eslint.interlace.tools/docs/security/plugin-typeorm-security/rules/require-tls?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-typeorm-security) | CWE-319 | A02:2021 |  | Require TLS on TypeORM DataSource connections, so queries and credentials are not sent in cleartext and the… | 🟢 |  |  |  |  |  |
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
  <a href="https://eslint.interlace.tools/docs/security/plugin-typeorm-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-typeorm-security"><img src="https://eslint.interlace.tools/images/og-typeorm-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>

<p align="center">
  <a href="https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-typeorm-security" target="blank"><img src="https://eslint.interlace.tools/icon-light.svg" alt="Interlace" height="70" /></a>
</p>
