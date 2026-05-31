<p align="center">
  <a href="https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-pg" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Security rules for PostgreSQL interaction in Node.js (SQL injection prevention).
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-pg" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-pg.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-pg" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-pg.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=pg" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=pg" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
</p>

> ⭐ If this plugin caught a real bug for you, [**star the repo**](https://github.com/ofri-peretz/eslint) — it's the signal that keeps these rules maintained.

## Description

This plugin provides Security rules for PostgreSQL interaction in Node.js (SQL injection prevention).

## Why pg-specific?

A generic SQL injection linter can flag string concatenation wherever it appears, but it cannot know the parameterization convention for each database client. The `pg` (node-postgres) driver uses `$1, $2, …` positional placeholders with a second-argument array — a pattern no generic rule encodes. `eslint-plugin-pg` knows this contract: it only fires on `.query()` calls, it stays silent when a second argument (the values array) is present, and it tracks variable taint across assignment statements so that a split-line pattern like `const sql = "SELECT..." + id; client.query(sql)` is flagged even though the concatenation and the query call are on separate lines. The result is a rule with near-zero false positives on legitimate parameterized queries and reliable detection on the patterns that actually lead to SQL injection.

## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/security/plugin-pg?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-pg), visit [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-pg). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/security/plugin-pg?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-pg), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-pg). 📚
- [가이드](https://eslint.interlace.tools/docs/security/plugin-pg?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-pg) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-pg)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/security/plugin-pg?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-pg)は [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-pg)でご確認ください。 📚
- Para ver la [guía](https://eslint.interlace.tools/docs/security/plugin-pg?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-pg), visita [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-pg). 📚
- للاطلاع على [الدليل](https://eslint.interlace.tools/docs/security/plugin-pg?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-pg)، قم بزيارة [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-pg). 📚

```bash
npm install eslint-plugin-pg --save-dev
```

## ⚙️ Configuration Presets
| Preset        | Description                                              |
| :------------ | :------------------------------------------------------- |
| `recommended` | Recommended preset - balanced security for most projects |
| `strict`      | Strict preset - all rules as errors                      |

## 📚 Supported Libraries
| Library              | npm                                                                                               | Downloads                                                                                                | Detection                       |
| -------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `pg` (node-postgres) | [![npm](https://img.shields.io/npm/v/pg.svg?style=flat-square)](https://www.npmjs.com/package/pg) | [![downloads](https://img.shields.io/npm/dt/pg.svg?style=flat-square)](https://www.npmjs.com/package/pg) | SQL Injection, Connection Leaks |

### Custom Configuration

```javascript
import pg from 'eslint-plugin-pg';

export default [
  {
    plugins: { pg },
    rules: {
      'pg/no-unsafe-query': 'error',
      'pg/no-select-all': 'off', // Disable if needed
    },
  },
];
```

## 💡 What You Get
- **PostgreSQL-specific rules:** Catches pg driver anti-patterns that generic linters miss
- **LLM-optimized messages:** Structured 2-line errors with CWE + fixes that AI assistants can apply
- **Connection safety:** Prevents leaks, double releases, and transaction race conditions
- **SQL security:** SQL injection, search_path hijacking, file access via COPY
- **Performance patterns:** N+1 queries, SELECT \*, bulk operation suggestions

Every rule produces a **structured error message**:

```bash
src/db.ts
  42:15  error  🔒 CWE-89 OWASP:A03-Injection CVSS:9.8 | Unsafe query detected | CRITICAL
                    Fix: Use parameterized query: client.query('SELECT * FROM users WHERE id = $1', [userId])
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
| [check-query-params](https://eslint.interlace.tools/docs/security/plugin-pg/rules/check-query-params?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-pg) | CWE-89 |  |  | Ensures the number of placeholders in SQL queries matches the provided parameters. | 🟢 |  | ⚠️ |  |  |  |
| [no-batch-insert-loop](https://eslint.interlace.tools/docs/security/plugin-pg/rules/no-batch-insert-loop?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-pg) | CWE-400 |  |  | Prevents INSERT/UPDATE/DELETE queries inside loops (N+1 query anti-pattern). | 🟢 |  | ⚠️ |  |  |  |
| [no-floating-query](https://eslint.interlace.tools/docs/security/plugin-pg/rules/no-floating-query?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-pg) | CWE-252 |  |  | Ensures query promises are awaited or handled. | 🟢 | 💼 |  |  |  |  |
| [no-hardcoded-credentials](https://eslint.interlace.tools/docs/security/plugin-pg/rules/no-hardcoded-credentials?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-pg) | CWE-798 |  |  | Prevents hardcoded passwords and connection strings in PostgreSQL client initialization. | 🟢 | 💼 |  |  |  |  |
| [no-insecure-ssl](https://eslint.interlace.tools/docs/security/plugin-pg/rules/no-insecure-ssl?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-pg) | CWE-295 |  |  | Prevents disabling SSL certificate validation in PostgreSQL connections. | 🟢 | 💼 |  |  |  |  |
| [no-missing-client-release](https://eslint.interlace.tools/docs/security/plugin-pg/rules/no-missing-client-release?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-pg) | CWE-772 |  |  | Ensures acquired pool clients are released back to the pool. | 🟢 | 💼 |  |  |  |  |
| [no-select-all](https://eslint.interlace.tools/docs/security/plugin-pg/rules/no-select-all?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-pg) | CWE-693 |  |  | Discourages SELECT  in favor of explicit column lists. | 🟢 |  | ⚠️ |  |  |  |
| [no-transaction-on-pool](https://eslint.interlace.tools/docs/security/plugin-pg/rules/no-transaction-on-pool?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-pg) | CWE-362 |  |  | Prevents running transaction commands directly on pool (must use dedicated client). | 🟢 | 💼 |  |  |  |  |
| [no-unsafe-copy-from](https://eslint.interlace.tools/docs/security/plugin-pg/rules/no-unsafe-copy-from?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-pg) | CWE-73 | A03:2021 |  | Prevents COPY FROM with file paths (should use STDIN for safe client-side data loading). | 🟢 | 💼 |  |  |  |  |
| [no-unsafe-query](https://eslint.interlace.tools/docs/security/plugin-pg/rules/no-unsafe-query?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-pg) | CWE-89 |  |  | SQL injection is one of the most critical security vulnerabilities | 🟢 | 💼 |  |  |  |  |
| [no-unsafe-search-path](https://eslint.interlace.tools/docs/security/plugin-pg/rules/no-unsafe-search-path?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-pg) | CWE-426 |  |  | Prevents dynamic SET searchpath queries that could enable schema hijacking. | 🟢 | 💼 |  |  |  |  |
| [prefer-pool-query](https://eslint.interlace.tools/docs/security/plugin-pg/rules/prefer-pool-query?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-pg) | CWE-693 |  |  | Suggests using pool.query() for single-shot queries instead of manual connect/release. | 🟢 |  | ⚠️ |  |  |  |
| [prevent-double-release](https://eslint.interlace.tools/docs/security/plugin-pg/rules/prevent-double-release?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-pg) | CWE-415 |  |  | Prevents calling client.release() multiple times on the same client. | 🟢 | 💼 |  |  |  |  |
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
  <a href="https://eslint.interlace.tools/docs/security/plugin-pg?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-pg"><img src="https://eslint.interlace.tools/images/og-pg.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>