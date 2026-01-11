# eslint-plugin-pg

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
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=pg" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=pg" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Dec_2025-blue?logo=rocket&logoColor=white" alt="Dec 2025" /></a>
</p>

## Description

Security rules for PostgreSQL interaction in Node.js (SQL injection prevention).

## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/pg), visit [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/pg), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- [가이드](https://eslint.interlace.tools/docs/pg) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/pg)は [eslint.interlace.tools](https://eslint.interlace.tools)でご確認ください。 📚

```bash
npm install eslint-plugin-pg --save-dev
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

---

## 📋 Available Presets
| Preset            | Description                                              |
| ----------------- | -------------------------------------------------------- |
| **`recommended`** | Balanced - security rules as errors, quality as warnings |
| **`strict`**      | All 13 rules as errors                                   |

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

---

## 🤖 For AI Agents
This plugin is optimized for [ESLint MCP](https://eslint.org/docs/latest/use/mcp), enabling AI assistants like **Cursor**, **GitHub Copilot**, and **Claude** to:

- Understand vulnerability types via CWE references
- Apply correct fixes using structured guidance
- Suggest bulk operations for N+1 patterns

```json
// .cursor/mcp.json
{
  "mcpServers": {
    "eslint": {
      "command": "npx",
      "args": ["@eslint/mcp@latest"]
    }
  }
}
```

See [AGENTS.md](./AGENTS.md) for agent-specific resolution strategies.

---

## 🔒 Privacy
This plugin runs **100% locally**. No data ever leaves your machine.

---

## Rules

**Legend**

| Icon | Description |
| :---: | :--- |
| 💼 | **Recommended**: Included in the recommended preset. |
| ⚠️ | **Warns**: Set towarn in recommended preset. |
| 🔧 | **Auto-fixable**: Automatically fixable by the `--fix` CLI option. |
| 💡 | **Suggestions**: Providing code suggestions in IDE. |
| 🚫 | **Deprecated**: This rule is deprecated. |

| Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| [no-unsafe-query](https://eslint.interlace.tools/docs/pg/rules/no-unsafe-query) | CWE-89 | A03:2025 |  | [no-unsafe-query](./docs/rules/no-unsafe-query.md) | 💼 |  |  | 💡 |  |
| [no-insecure-ssl](https://eslint.interlace.tools/docs/pg/rules/no-insecure-ssl) | CWE-295 | A05:2025 |  | [no-insecure-ssl](./docs/rules/no-insecure-ssl.md) | 💼 |  |  | 💡 |  |
| [no-hardcoded-credentials](https://eslint.interlace.tools/docs/pg/rules/no-hardcoded-credentials) | CWE-798 | A05:2025 |  | [no-hardcoded-credentials](./docs/rules/no-hardcoded-credentials.md) | 💼 |  |  | 💡 |  |
| [no-unsafe-search-path](https://eslint.interlace.tools/docs/pg/rules/no-unsafe-search-path) | CWE-426 | A01:2025 |  | [no-unsafe-search-path](./docs/rules/no-unsafe-search-path.md) | 💼 |  |  | 💡 |  |
| [no-unsafe-copy-from](https://eslint.interlace.tools/docs/pg/rules/no-unsafe-copy-from) | CWE-22 | A03:2025 |  | [no-unsafe-copy-from](./docs/rules/no-unsafe-copy-from.md) | 💼 |  |  | 💡 |  |
| [no-transaction-on-pool](https://eslint.interlace.tools/docs/pg/rules/no-transaction-on-pool) | CWE-362 | A04:2025 |  | [no-transaction-on-pool](./docs/rules/no-transaction-on-pool.md) | 💼 |  |  | 💡 |  |
| [no-missing-client-release](https://eslint.interlace.tools/docs/pg/rules/no-missing-client-release) | CWE-772 | A09:2025 |  | [no-missing-client-release](./docs/rules/no-missing-client-release.md) | 💼 |  |  | 💡 |  |
| [prevent-double-release](https://eslint.interlace.tools/docs/pg/rules/prevent-double-release) | CWE-415 | A04:2025 |  | [prevent-double-release](./docs/rules/prevent-double-release.md) | 💼 |  |  | 💡 |  |
| [no-floating-query](https://eslint.interlace.tools/docs/pg/rules/no-floating-query) | CWE-252 | A06:2025 |  | [no-floating-query](./docs/rules/no-floating-query.md) | 💼 |  |  | 💡 |  |
| [check-query-params](https://eslint.interlace.tools/docs/pg/rules/check-query-params) | CWE-20 | A06:2025 |  | [check-query-params](./docs/rules/check-query-params.md) | 💼 |  |  | 💡 |  |
| [no-select-all](https://eslint.interlace.tools/docs/pg/rules/no-select-all) | CWE-400 | A04:2025 |  | [no-select-all](./docs/rules/no-select-all.md) |  |  |  | 💡 |  |
| [prefer-pool-query](https://eslint.interlace.tools/docs/pg/rules/prefer-pool-query) | CWE-404 | A04:2025 |  | [prefer-pool-query](./docs/rules/prefer-pool-query.md) |  |  |  | 💡 |  |
| [no-batch-insert-loop](https://eslint.interlace.tools/docs/pg/rules/no-batch-insert-loop) | CWE-400 | A04:2025 |  | [no-batch-insert-loop](./docs/rules/no-batch-insert-loop.md) | 💼 |  |  | 💡 |  |

## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint Ecosystem** — AI-native security plugins with LLM-optimized error messages:

| Plugin | NPM | Downloads | License | Description |
| :--- | :---: | :---: | :---: | :--- |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) | [![npm](https://img.shields.io/npm/v/eslint-plugin-secure-coding.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-secure-coding) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-secure-coding.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-secure-coding) | [![license](https://img.shields.io/npm/l/eslint-plugin-secure-coding.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-secure-coding) | General security rules & OWASP guidelines. |
| [`eslint-plugin-pg`](https://www.npmjs.com/package/eslint-plugin-pg) | [![npm](https://img.shields.io/npm/v/eslint-plugin-pg.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-pg) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-pg.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-pg) | [![license](https://img.shields.io/npm/l/eslint-plugin-pg.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-pg) | PostgreSQL security & best practices. |
| [`eslint-plugin-crypto`](https://www.npmjs.com/package/eslint-plugin-crypto) | [![npm](https://img.shields.io/npm/v/eslint-plugin-crypto.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-crypto) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-crypto.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-crypto) | [![license](https://img.shields.io/npm/l/eslint-plugin-crypto.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-crypto) | NodeJS Cryptography security rules. |
| [`eslint-plugin-jwt`](https://www.npmjs.com/package/eslint-plugin-jwt) | [![npm](https://img.shields.io/npm/v/eslint-plugin-jwt.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-jwt) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-jwt.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-jwt) | [![license](https://img.shields.io/npm/l/eslint-plugin-jwt.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-jwt) | JWT security & best practices. |
| [`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security) | [![npm](https://img.shields.io/npm/v/eslint-plugin-browser-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-browser-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-browser-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-browser-security) | [![license](https://img.shields.io/npm/l/eslint-plugin-browser-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-browser-security) | Browser-specific security & XSS prevention. |
| [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | [![npm](https://img.shields.io/npm/v/eslint-plugin-vercel-ai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-vercel-ai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | [![license](https://img.shields.io/npm/l/eslint-plugin-vercel-ai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | Vercel AI SDK security rules. |
| [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security) | [![npm](https://img.shields.io/npm/v/eslint-plugin-express-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-express-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-express-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-express-security) | [![license](https://img.shields.io/npm/l/eslint-plugin-express-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-express-security) | Express.js security hardening rules. |
| [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security) | [![npm](https://img.shields.io/npm/v/eslint-plugin-lambda-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-lambda-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-lambda-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-lambda-security) | [![license](https://img.shields.io/npm/l/eslint-plugin-lambda-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-lambda-security) | AWS Lambda security best practices. |
| [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | [![npm](https://img.shields.io/npm/v/eslint-plugin-nestjs-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-nestjs-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | [![license](https://img.shields.io/npm/l/eslint-plugin-nestjs-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | NestJS security rules & patterns. |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next) | [![npm](https://img.shields.io/npm/v/eslint-plugin-import-next.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import-next) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-import-next.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import-next) | [![license](https://img.shields.io/npm/l/eslint-plugin-import-next.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import-next) | Next-gen import sorting & architecture. |

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/pg"><img src="https://eslint.interlace.tools/images/og-pg.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>