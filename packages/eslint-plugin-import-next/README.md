# eslint-plugin-import-next

> **The high-performance, agentic alternative to `eslint-plugin-import`.** Detect cycles 100x faster with caching, and fix them automatically with AI-optimized suggestions.

[![npm version](https://img.shields.io/npm/v/eslint-plugin-import-next.svg)](https://www.npmjs.com/package/eslint-plugin-import-next)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![codecov](https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=import_next)](https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=import_next)

---

## 💡 What you get

- **100x faster cycle detection:** Uses **shared filesystem caching** for instant feedback, even in large monorepos.
- **LLM-optimized & MCP-ready:** Structured 2-line messages with CWE + concrete fixes so humans _and_ AI auto-fixers stay aligned.
- **Smart refactoring suggestions:** Doesn't just say "Cycle Detected" - tells you exactly how to refactor (e.g., "Extract types to `types.ts`" vs "Use Dependency Injection").
- **Tiered presets:** `recommended`, `architecture` for fast policy rollout.
- **Zero false positives:** Precise detection with incremental caching.

---

## 📊 OWASP Coverage Matrix

> **Note:** This plugin focuses on **code architecture and dependency management** rather than OWASP security. For security rules, see [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding).

| Category                  | CWE      | Rules                                                 |
| ------------------------- | -------- | ----------------------------------------------------- |
| **Circular Dependencies** | CWE-407  | `no-circular-dependencies`                            |
| **Module Resolution**     | CWE-829  | `no-unresolved`, `no-self-import`, `no-duplicates`    |
| **Architecture**          | CWE-1047 | `no-internal-modules`, `enforce-dependency-direction` |

---

## ⚡ Performance: The "Killer Feature"

`import/no-cycle` is notorious for slowing down builds because it re-analyzes the entire graph for every file.
**`import-next/no-circular-dependencies`** uses a **smart incremental cache** that persists across lint runs.

| Rule                                       | Time (10k files)   | Memory |
| ------------------------------------------ | ------------------ | ------ |
| `import/no-cycle`                          | ~45s               | High   |
| **`import-next/no-circular-dependencies`** | **~0.4s** (cached) | Low    |

---

## 🤖 Smart Fixes (Agentic)

Unlike legacy plugins, we analyze the _type_ of cycle and suggest the correct architectural pattern.

### Scenario A: Type-only Cycle

**Error:**

```bash
Cycle: User.ts -> Post.ts -> User.ts
Message: 🧩 CWE-407 | Circular dependency detected (Types only)
         Fix: Extract shared types to 'types.ts'
```

### Scenario B: Hard Dependency

**Error:**

```bash
Cycle: ServiceA.ts -> ServiceB.ts -> ServiceA.ts
Message: 🏗️ CWE-407 | Circular dependency detected (Hard Coupling)
         Fix: Use Dependency Injection pattern or split 'ServiceA' into Core/Extended
```

---

## 📦 Installation

```bash
npm install --save-dev eslint-plugin-dependencies
# or
pnpm add -D eslint-plugin-dependencies
```

## 🚀 Quick Start (Flat Config)

```javascript
// eslint.config.js
import dependencies from 'eslint-plugin-dependencies';

export default [
  // 1. Recommended (Balanced)
  dependencies.configs.recommended,

  // 2. OR Architecture Strict (Good for Monorepos)
  dependencies.configs.architecture,
];
```

---

## 🔐 Rules

💼 = Set in `recommended` | 🔧 = Auto-fixable | 💡 = Has suggestions

### ⚡ Performance & Architecture

| Rule                                                                         | CWE      | Description                                       | 💼  | 🔧  | 💡  |
| ---------------------------------------------------------------------------- | -------- | ------------------------------------------------- | --- | --- | --- |
| [no-circular-dependencies](./docs/rules/no-circular-dependencies.md)         | CWE-407  | **Fast**, cached cycle detection                  | 💼  |     | 💡  |
| [no-internal-modules](./docs/rules/no-internal-modules.md)                   | CWE-1047 | Enforce entry points (no `import .../dist/utils`) | 💼  |     | 💡  |
| [enforce-dependency-direction](./docs/rules/enforce-dependency-direction.md) | CWE-1047 | Enforce layered architecture                      | 💼  |     | 💡  |

### 📦 Module Resolution

| Rule                                             | CWE     | Description                     | 💼  | 🔧  | 💡  |
| ------------------------------------------------ | ------- | ------------------------------- | --- | --- | --- |
| [no-unresolved](./docs/rules/no-unresolved.md)   | CWE-829 | Ensure imports resolve          | 💼  |     | 💡  |
| [no-duplicates](./docs/rules/no-duplicates.md)   | CWE-561 | Merge duplicate imports         | 💼  | 🔧  |     |
| [no-self-import](./docs/rules/no-self-import.md) | CWE-835 | Prevent importing the same file | 💼  |     | 💡  |

### 🧹 Clean Code

| Rule                                                                     | CWE      | Description                 | 💼  | 🔧  | 💡  |
| ------------------------------------------------------------------------ | -------- | --------------------------- | --- | --- | --- |
| [enforce-import-order](./docs/rules/enforce-import-order.md)             | CWE-1078 | Group imports automatically | 💼  | 🔧  |     |
| [no-unused-modules](./docs/rules/no-unused-modules.md)                   | CWE-561  | Find dead code              |     |     | 💡  |
| [no-extraneous-dependencies](./docs/rules/no-extraneous-dependencies.md) | CWE-1104 | Prevent devDeps in prod     | 💼  |     | 💡  |

---

## 🤖 LLM & MCP Integration

This plugin is optimized for **Cursor** and **GitHub Copilot**. Add this to your `.cursor/mcp.json` to let the AI run and fix these rules directly:

```json
{
  "mcpServers": {
    "eslint": {
      "command": "npx",
      "args": ["@eslint/mcp@latest"]
    }
  }
}
```

---

## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint Ecosystem** — AI-native security plugins with LLM-optimized error messages:

| Plugin                                                                                               | Description                                                  | Rules |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | :---: |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding)           | Universal security (OWASP Top 10 Web + Mobile)               |  89   |
| [`eslint-plugin-jwt`](https://www.npmjs.com/package/eslint-plugin-jwt)                               | JWT security (algorithm confusion, weak secrets, claims)     |  13   |
| [`eslint-plugin-crypto`](https://www.npmjs.com/package/eslint-plugin-crypto)                         | Cryptographic best practices (weak algorithms, key handling) |  24   |
| [`eslint-plugin-pg`](https://www.npmjs.com/package/eslint-plugin-pg)                                 | PostgreSQL/node-postgres security                            |  13   |
| [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | Vercel AI SDK security                                       |  19   |

---

## License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)
