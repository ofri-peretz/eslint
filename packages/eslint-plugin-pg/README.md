# eslint-plugin-pg

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Security rules for PostgreSQL interaction in Node.js.
</p>
[![npm version](https://img.shields.io/npm/v/eslint-plugin-pg.svg)](https://www.npmjs.com/package/eslint-plugin-pg)
[![npm downloads](https://img.shields.io/npm/dm/eslint-plugin-pg.svg)](https://www.npmjs.com/package/eslint-plugin-pg)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![codecov](https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=pg)](https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=pg)
[![AI-Native: Agent Ready](https://img.shields.io/badge/AI--Native-Agent%20Ready-success)](https://eslint.org/docs/latest/use/mcp)
[![Dec 2025](https://img.shields.io/badge/Dec_2025-blue?logo=rocket&logoColor=white)](https://github.com/ofri-peretz/eslint)

## Description

> **📘 Full Documentation:** [https://eslint.interlace.tools/docs/pg](https://eslint.interlace.tools/docs/pg)
>
> 🔐 Security-focused ESLint plugin for PostgreSQL/node-postgres. Detects SQL injection, connection leaks, transaction issues, and hardcoded credentials with LLM-optimized fix guidance.

> [!TIP]
> For **complete OWASP coverage**, combine with [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) which provides 78 additional rules covering all OWASP categories.

## Philosophy
 
**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

```bash
npm install eslint-plugin-pg --save-dev
```

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Security rules for PostgreSQL interaction in Node.js.
</p>

## Description

## Getting Started

```bash
npm install eslint-plugin-pg --save-dev
```

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Security rules for PostgreSQL interaction in Node.js.
</p>
## Description

## Getting Started

```bash
npm install eslint-plugin-pg --save-dev
```

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Security rules for PostgreSQL interaction in Node.js.
</p>
## Description

## Getting Started

```bash
npm install eslint-plugin-pg --save-dev
```

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Security rules for PostgreSQL interaction in Node.js.
</p>
## Description

## Getting Started

```bash
npm install eslint-plugin-pg --save-dev
```

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

Security rules for PostgreSQL interaction in Node.js.

## Description

## Getting Started

```bash
npm install eslint-plugin-pg --save-dev
```

Security rules for PostgreSQL interaction in Node.js.

## Description

## Getting Started

```bash
npm install eslint-plugin-pg --save-dev
```

---

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

## Rules
| Rule | Tag | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :--- | :---: | :---: | :---: | :--- | :-: | :-: | :-: | :-: | :-: |
|  Rule                                                                    | General |  Tag      |    CWE    |   OWASP   |   CVSS    |  Description  |           💼            |    ⚠️     |     🔧     |                        💡                         |  🚫   |
|  [no-unsafe-query](./docs/rules/no-unsafe-query.md)                      | General |  General  |  General  |  General  |  General  |  General      |        Security         |  CWE-89   |  A03:2021  |  Prevents SQL injection via string interpolation  |  💼   |  💡   |
|  [no-insecure-ssl](./docs/rules/no-insecure-ssl.md)                      | General |  General  |  General  |  General  |  General  |  General      |        Security         |  CWE-295  |  A05:2021  |   Prevents disabling SSL certificate validation   |  💼   |  💡   |
|  [no-hardcoded-credentials](./docs/rules/no-hardcoded-credentials.md)    | General |  General  |  General  |  General  |  General  |  General      |        Security         |  CWE-798  |  A05:2021  |      Prevents hardcoded passwords in config       |  💼   |  💡   |
|  [no-unsafe-search-path](./docs/rules/no-unsafe-search-path.md)          | General |  General  |  General  |  General  |  General  |  General      |        Security         |  CWE-426  |  A01:2021  |      Prevents dynamic search_path hijacking       |  💼   |  💡   |
|  [no-unsafe-copy-from](./docs/rules/no-unsafe-copy-from.md)              | General |  General  |  General  |  General  |  General  |  General      |        Security         |  CWE-22   |  A03:2021  |       Prevents COPY FROM file path exposure       |  💼   |  💡   |
|  [no-transaction-on-pool](./docs/rules/no-transaction-on-pool.md)        | General |  General  |  General  |  General  |  General  |  General      |        Security         |  CWE-362  |  A04:2021  |       Prevents transaction commands on pool       |  💼   |  💡   |
|  [no-missing-client-release](./docs/rules/no-missing-client-release.md)  | General |  General  |  General  |  General  |  General  |  General      |   Resource Management   |  CWE-772  |  A09:2021  |         Ensures pool clients are released         |  💼   |  💡   |
|  [prevent-double-release](./docs/rules/prevent-double-release.md)        | General |  General  |  General  |  General  |  General  |  General      |   Resource Management   |  CWE-415  |  A04:2021  |         Prevents double client.release()          |  💼   |  💡   |
|  [no-floating-query](./docs/rules/no-floating-query.md)                  | General |  General  |  General  |  General  |  General  |  General      |   Resource Management   |  CWE-252  |  A06:2021  |        Ensures query promises are handled         |  💼   |  💡   |
|  [check-query-params](./docs/rules/check-query-params.md)                | General |  General  |  General  |  General  |  General  |  General      |  Quality & Performance  |  CWE-20   |  A06:2021  |  Validates parameter count matches placeholders   |  💼   |  💡   |
|  [no-select-all](./docs/rules/no-select-all.md)                          | General |  General  |  General  |  General  |  General  |  General      |  Quality & Performance  |  CWE-400  |  A04:2021  |               Discourages SELECT \*               |  💡   |
|  [prefer-pool-query](./docs/rules/prefer-pool-query.md)                  | General |  General  |  General  |  General  |  General  |  General      |  Quality & Performance  |  CWE-404  |  A04:2021  |     Suggests pool.query() for simple queries      |  💡   |
|  [no-batch-insert-loop](./docs/rules/no-batch-insert-loop.md)            | General |  General  |  General  |  General  |  General  |  General      |  Quality & Performance  |  CWE-400  |  A04:2021  |           Prevents N+1 mutation queries           |  💼   |  💡   |

## 🚀 Quick Start

```bash
npm install --save-dev eslint-plugin-pg
```

```javascript
// eslint.config.js
import pg from 'eslint-plugin-pg';

export default [pg.configs.recommended];
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

## 📚 Documentation

- **[Rules Reference](./docs/RULES.md)** - Complete list of all 13 rules

---

## 🗂️ OWASP Top 10 2021 Coverage

| OWASP Category                         | Rule | CWE | OWASP | CVSS | Description | 💼  | ⚠️  | 🔧  | 💡  | 🚫  |
| :------------------------------------- | :--: | :-: | :---: | :--- | :---------: | :-: | :-: | :-: | :-: | --- |
| **A01:2021 Broken Access Control**     |      |     |       |      |             |     |     |     |     |
| **A03:2021 Injection**                 |      |     |       |      |             |     |     |     |     |
| **A04:2021 Insecure Design**           |      |     |       |      |             |     |     |     |     |
| **A05:2021 Security Misconfiguration** |      |     |       |      |             |     |     |     |     |
| **A06:2021 Vulnerable Components**     |      |     |       |      |             |     |     |     |     |
| **A09:2021 Logging Failures**          |      |     |       |      |             |     |     |     |     |

---

## 🔗 Related Plugins

Part of the **Interlace ESLint Ecosystem** — AI-native security plugins with LLM-optimized error messages:

| Plugin                                                                                               | Downloads | Description |
| :--------------------------------------------------------------------------------------------------- | :-------: | :---------- |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding)           |           |             |
| [`eslint-plugin-jwt`](https://www.npmjs.com/package/eslint-plugin-jwt)                               |           |             |
| [`eslint-plugin-crypto`](https://www.npmjs.com/package/eslint-plugin-crypto)                         |           |             |
| [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security)     |           |             |
| [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security)       |           |             |
| [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security)       |           |             |
| [`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security)     |           |             |
| [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) |           |             |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next)               |           |             |

---

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<a href="https://eslint.interlace.tools/docs/pg"><img src="https://eslint.interlace.tools/images/og-pg.png" alt="ESLint Interlace Plugin" width="100%" /></a>