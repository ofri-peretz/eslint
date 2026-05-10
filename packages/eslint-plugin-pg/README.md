<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Security rules for PostgreSQL interaction in Node.js (SQL injection prevention).
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-pg" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-pg.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-pg" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-pg.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=eslint-plugin-pg" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=eslint-plugin-pg" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
</p>

## Description

This plugin provides Security rules for PostgreSQL interaction in Node.js (SQL injection prevention).
By using this plugin, you can proactively identify and mitigate security risks across your entire codebase.

## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/security/plugin-pg), visit [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/security/plugin-pg), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- [가이드](https://eslint.interlace.tools/docs/security/plugin-pg) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/security/plugin-pg)は [eslint.interlace.tools](https://eslint.interlace.tools)でご確認ください。 📚
- Para ver la [guía](https://eslint.interlace.tools/docs/security/plugin-pg), visita [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- للاطلاع على [الدليل](https://eslint.interlace.tools/docs/security/plugin-pg)، قم بزيارة [eslint.interlace.tools](https://eslint.interlace.tools). 📚

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

## Rules

**Legend**

| Icon | Description |
| :---: | :--- |
| 💼 | **Recommended**: Included in the recommended preset. |
| ⚠️ | **Warns**: Set towarn in recommended preset. |
| 🔧 | **Auto-fixable**: Automatically fixable by the `--fix` CLI option. |
| 💡 | **Suggestions**: Providing code suggestions in IDE. |
| 🚫 | **Deprecated**: This rule is deprecated. |
| 🟢 | **Type-unaware**: AST-only, runs in oxlint JS-plugin tier. |
| 🟡 | **Type-aware (refining)**: pure-AST primary path; types refine precision. |
| 🟠 | **Type-aware (graceful)**: requires TS program; silent without it. |

| Rule | CWE | OWASP | CVSS | Description | 🧠 | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| [check-query-params](https://eslint.interlace.tools/docs/security/plugin-pg/rules/check-query-params) | CWE-20 | A06:2025 |  | ESLint rule documentation for check-query-params | 🟢 | 💼 | ⚠️ |  | 💡 |  |
| [no-batch-insert-loop](https://eslint.interlace.tools/docs/security/plugin-pg/rules/no-batch-insert-loop) | CWE-400 | A04:2025 |  | ESLint rule documentation for no-batch-insert-loop | 🟢 | 💼 | ⚠️ |  | 💡 |  |
| [no-floating-query](https://eslint.interlace.tools/docs/security/plugin-pg/rules/no-floating-query) | CWE-252 | A06:2025 |  | ESLint rule documentation for no-floating-query | 🟢 | 💼 |  |  | 💡 |  |
| [no-hardcoded-credentials](https://eslint.interlace.tools/docs/security/plugin-pg/rules/no-hardcoded-credentials) | CWE-798 | A05:2025 |  | ESLint rule documentation for no-hardcoded-credentials | 🟢 | 💼 |  |  | 💡 |  |
| [no-insecure-ssl](https://eslint.interlace.tools/docs/security/plugin-pg/rules/no-insecure-ssl) | CWE-295 | A05:2025 |  | ESLint rule documentation for no-insecure-ssl | 🟢 | 💼 |  |  | 💡 |  |
| [no-missing-client-release](https://eslint.interlace.tools/docs/security/plugin-pg/rules/no-missing-client-release) | CWE-772 | A09:2025 |  | ESLint rule documentation for no-missing-client-release | 🟢 | 💼 |  |  | 💡 |  |
| [no-select-all](https://eslint.interlace.tools/docs/security/plugin-pg/rules/no-select-all) | CWE-400 | A04:2025 |  | ESLint rule documentation for no-select-all | 🟢 | 💼 | ⚠️ |  | 💡 |  |
| [no-transaction-on-pool](https://eslint.interlace.tools/docs/security/plugin-pg/rules/no-transaction-on-pool) | CWE-362 | A04:2025 |  | ESLint rule documentation for no-transaction-on-pool | 🟢 | 💼 |  |  | 💡 |  |
| [no-unsafe-copy-from](https://eslint.interlace.tools/docs/security/plugin-pg/rules/no-unsafe-copy-from) | CWE-22 | A03:2025 |  | ESLint rule documentation for no-unsafe-copy-from | 🟢 | 💼 |  |  | 💡 |  |
| [no-unsafe-query](https://eslint.interlace.tools/docs/security/plugin-pg/rules/no-unsafe-query) | CWE-89 | A03:2025 |  | ESLint rule documentation for no-unsafe-query | 🟢 | 💼 |  |  | 💡 |  |
| [no-unsafe-search-path](https://eslint.interlace.tools/docs/security/plugin-pg/rules/no-unsafe-search-path) | CWE-426 | A01:2025 |  | ESLint rule documentation for no-unsafe-search-path | 🟢 | 💼 |  |  | 💡 |  |
| [prefer-pool-query](https://eslint.interlace.tools/docs/security/plugin-pg/rules/prefer-pool-query) | CWE-404 | A04:2025 |  | ESLint rule documentation for prefer-pool-query | 🟢 | 💼 | ⚠️ |  | 💡 |  |
| [prevent-double-release](https://eslint.interlace.tools/docs/security/plugin-pg/rules/prevent-double-release) | CWE-415 | A04:2025 |  | ESLint rule documentation for prevent-double-release | 🟢 | 💼 |  |  | 💡 |  |

## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint Ecosystem** — AI-native security plugins with LLM-optimized error messages:

| Plugin | Downloads | Description |
| :--- | :---: | :--- |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-secure-coding.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-secure-coding) | General security rules & OWASP guidelines. |
| [`eslint-plugin-pg`](https://www.npmjs.com/package/eslint-plugin-pg) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-pg.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-pg) | PostgreSQL security & best practices. |
| [`eslint-plugin-crypto`](https://www.npmjs.com/package/eslint-plugin-crypto) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-crypto.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-crypto) | NodeJS Cryptography security rules. |
| [`eslint-plugin-jwt`](https://www.npmjs.com/package/eslint-plugin-jwt) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-jwt.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-jwt) | JWT security & best practices. |
| [`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-browser-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-browser-security) | Browser-specific security & XSS prevention. |
| [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-express-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-express-security) | Express.js security hardening rules. |
| [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-lambda-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-lambda-security) | AWS Lambda security best practices. |
| [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-nestjs-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | NestJS security rules & patterns. |
| [`eslint-plugin-mongodb-security`](https://www.npmjs.com/package/eslint-plugin-mongodb-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-mongodb-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-mongodb-security) | MongoDB security best practices. |
| [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-vercel-ai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | Vercel AI SDK security hardening. |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-import-next.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import-next) | Next-gen import sorting & architecture. |

## 📦 Compatibility

| Package | Version |
| :--- | :--- |
| ESLint | `^8.0.0 \|\| ^9.0.0 \|\| ^10.0.0` |
| Node.js | `>=18.0.0` |

See the [ESLint Version Support Policy](../../docs/ESLINT_VERSION_SUPPORT.md) — current ecosystem share data, the 20% gate, and the forward-looking exception that covers v10.

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-pg"><img src="https://eslint.interlace.tools/images/og-pg.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>