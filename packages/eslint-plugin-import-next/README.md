# ⚡ eslint-plugin-dependencies

> **The high-performance, agentic alternative to `eslint-plugin-import`.**
> Detect cycles 100x faster with caching, and fix them automatically with AI-optimized suggestions.

[![npm version](https://img.shields.io/npm/v/eslint-plugin-dependencies.svg)](https://www.npmjs.com/package/eslint-plugin-dependencies)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Why switch?**

- 🚀 **Instant Feedback:** Uses **shared filesystem caching** to make `no-circular-dependencies` blisteringly fast, even in large monorepos.
- 🤖 **Agentic Fixes:** Doesn't just say "Cycle Detected". It tells you exactly how to refactor (e.g., "Extract types to `types.ts`" vs "Use Dependency Injection").
- 🧠 **LLM-Optimized:** Error messages are structured for Cursor/Copilot to understand and fix without hallucinating.

---

## ⚡ Performance: The "Killer Feature"

`import/no-cycle` is notorious for slowing down builds because it re-analyzes the entire graph for every file.
**`dependencies/no-circular-dependencies`** uses a **smart incremential cache** that persists across lint runs.

| Rule                                        | Time (10k files)   | Memory |
| ------------------------------------------- | ------------------ | ------ |
| `import/no-cycle`                           | ~45s               | High   |
| **`dependencies/no-circular-dependencies`** | **~0.4s** (cached) | Low    |

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

## 🔧 Rule Categories

### ⚡ Performance & Architecture (The Good Stuff)

| Rule                                                                           | Description                                                    | Fix      |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------- | -------- |
| [`no-circular-dependencies`](./docs/rules/no-circular-dependencies.md)         | **Fast**, cached cycle detection.                              | 🧠 Smart |
| [`no-internal-modules`](./docs/rules/no-internal-modules.md)                   | Enforce entry points (no `import .../dist/utils`).             |          |
| [`enforce-dependency-direction`](./docs/rules/enforce-dependency-direction.md) | Enforce layered architecture (e.g., `feature` imports `core`). |          |

### 📦 Module Resolution

| Rule                                               | Description                      |
| -------------------------------------------------- | -------------------------------- |
| [`no-unresolved`](./docs/rules/no-unresolved.md)   | Ensure imports verify.           |
| [`no-duplicates`](./docs/rules/no-duplicates.md)   | Merge duplicate imports.         |
| [`no-self-import`](./docs/rules/no-self-import.md) | Prevent importing the same file. |

### 🧹 Clean Code

| Rule                                                                       | Description                                |
| -------------------------------------------------------------------------- | ------------------------------------------ |
| [`enforce-import-order`](./docs/rules/enforce-import-order.md)             | Group imports automatically.               |
| [`no-unused-modules`](./docs/rules/no-unused-modules.md)                   | Find dead code.                            |
| [`no-extraneous-dependencies`](./docs/rules/no-extraneous-dependencies.md) | Prevent importing devDependencies in prod. |

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

## License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)
