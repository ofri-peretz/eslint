# eslint-plugin-pg

**Security and best practices rules for the `pg` Node.js driver that AI assistants can understand and fix.**

[![npm version](https://img.shields.io/npm/v/eslint-plugin-pg.svg)](https://www.npmjs.com/package/eslint-plugin-pg)
[![npm downloads](https://img.shields.io/npm/dm/eslint-plugin-pg.svg)](https://www.npmjs.com/package/eslint-plugin-pg)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![AI-Native: Agent Ready](https://img.shields.io/badge/AI--Native-Agent%20Ready-success)](https://eslint.org/docs/latest/use/mcp)

> **PostgreSQL Security Standard:** 13 rules for SQL injection prevention, connection management, and database best practices with CWE references and LLM-optimized messages.

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

## 🔐 13 Rules by Category

### Security (6 rules)

| Rule                                                                 | CWE     | Severity | Description                                     |
| -------------------------------------------------------------------- | ------- | -------- | ----------------------------------------------- |
| [no-unsafe-query](./docs/rules/no-unsafe-query.md)                   | CWE-89  | Critical | Prevents SQL injection via string interpolation |
| [no-insecure-ssl](./docs/rules/no-insecure-ssl.md)                   | CWE-295 | High     | Prevents disabling SSL certificate validation   |
| [no-hardcoded-credentials](./docs/rules/no-hardcoded-credentials.md) | CWE-798 | High     | Prevents hardcoded passwords in config          |
| [no-unsafe-search-path](./docs/rules/no-unsafe-search-path.md)       | CWE-426 | High     | Prevents dynamic search_path hijacking          |
| [no-unsafe-copy-from](./docs/rules/no-unsafe-copy-from.md)           | CWE-22  | Critical | Prevents COPY FROM file path exposure           |
| [no-transaction-on-pool](./docs/rules/no-transaction-on-pool.md)     | CWE-362 | High     | Prevents transaction commands on pool           |

### Resource Management (3 rules)

| Rule                                                                   | CWE     | Severity | Description                        |
| ---------------------------------------------------------------------- | ------- | -------- | ---------------------------------- |
| [no-missing-client-release](./docs/rules/no-missing-client-release.md) | CWE-772 | High     | Ensures pool clients are released  |
| [prevent-double-release](./docs/rules/prevent-double-release.md)       | CWE-415 | Medium   | Prevents double client.release()   |
| [no-floating-query](./docs/rules/no-floating-query.md)                 | CWE-252 | Medium   | Ensures query promises are handled |

### Quality & Performance (4 rules)

| Rule                                                         | Severity | Description                                    |
| ------------------------------------------------------------ | -------- | ---------------------------------------------- |
| [check-query-params](./docs/rules/check-query-params.md)     | Medium   | Validates parameter count matches placeholders |
| [no-select-all](./docs/rules/no-select-all.md)               | Low      | Discourages SELECT \*                          |
| [prefer-pool-query](./docs/rules/prefer-pool-query.md)       | Low      | Suggests pool.query() for simple queries       |
| [no-batch-insert-loop](./docs/rules/no-batch-insert-loop.md) | Medium   | Prevents N+1 mutation queries                  |

---

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

## 🔗 Related Plugins

- [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) - 89 general security rules
- [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) - AI SDK security

---

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)
