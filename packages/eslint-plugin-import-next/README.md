# eslint-plugin-import-next

<div align="center">
  <img src="https://eslint.interlace.tools/images/interlace-hero.png" alt="ESLint Interlace - eslint-plugin-import-next" width="200" />
</div>

Next-generation import sorting and validation rules.

[![npm version](https://img.shields.io/npm/v/eslint-plugin-import-next.svg)](https://www.npmjs.com/package/eslint-plugin-import-next)
[![npm downloads](https://img.shields.io/npm/dm/eslint-plugin-import-next.svg)](https://www.npmjs.com/package/eslint-plugin-import-next)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![codecov](https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=import-next)](https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=import-next)
[![Dec 2025](https://img.shields.io/badge/Dec_2025-blue?logo=rocket&logoColor=white)](https://github.com/ofri-peretz/eslint)

## Description

> **📘 Full Documentation:** [https://eslint.interlace.tools/docs/import-next](https://eslint.interlace.tools/docs/import-next)
>
> 📢 **Found an issue we haven't addressed?** [Open an issue](https://github.com/ofri-peretz/eslint/issues) - we prioritize real developer pain.

>
> [!TIP]
> For **complete OWASP coverage**, combine with [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) which provides 78 additional rules covering all OWASP categories.

## Philosophy

Interlace isn't just a set of rules; it's a philosophy of "interlacing" security directly into your development workflow. We believe in tools that guide rather than gatekeep, providing actionable, educational feedback that elevates developer expertise while securing code.

## Getting Started

```bash
npm install eslint-plugin-import-next --save-dev
```

---

## 🎯 The `no-cycle` Problem (Why This Plugin Exists)

### The `maxDepth` Limitation in `eslint-plugin-import`

The original `eslint-plugin-import` has a critical limitation: the `maxDepth` option defaults to `Infinity` in theory, but **in practice, many projects are forced to set `maxDepth: 1` or `maxDepth: 2`** because:

```javascript
// eslint.config.js - Common workaround in legacy projects
{
  rules: {
    // ❌ PROBLEM: Had to limit maxDepth due to performance
    'import/no-cycle': ['error', { maxDepth: 1 }]
  }
}
```

**Why this happens:**

1. **Performance** - Full graph analysis on every lint run (no caching)
2. **Memory** - Large codebases exhaust memory with deep traversal
3. **Timeout** - CI/CD pipelines timeout on large monorepos

**The consequence:** Cycles at depth 3+ go undetected, causing:

### Real-World Impact on Bundlers

| Bundler     | Symptom                                                   | Cause                          |
| ----------- | --------------------------------------------------------- | ------------------------------ |
| **Vite**    | `ReferenceError: Cannot access 'X' before initialization` | Circular import race condition |
| **Next.js** | Build hangs, OOM errors                                   | Infinite resolution loop       |
| **Webpack** | Incorrect tree-shaking, larger bundles                    | Dependency graph confusion     |
| **esbuild** | Silent failures in production                             | Module order ambiguity         |

### Example: Hidden Deep Cycle

```
// With maxDepth: 2, this cycle is UNDETECTED:

src/
├── features/
│   └── auth/
│       └── AuthProvider.tsx
│           └── imports useUser from →
│               src/hooks/useUser.ts
│                   └── imports fetchUser from →
│                       src/api/user.ts
│                           └── imports authConfig from →
│                               src/config/auth.ts
│                                   └── imports AuthProvider from → (CYCLE at depth 4!)
│                                       src/features/auth/AuthProvider.tsx
```

**With `import/no-cycle` maxDepth: 2** → ❌ Not detected  
**With `import-next/no-cycle`** → ✅ Detected instantly (cached)

---

## ⚡ Performance: The `no-cycle` Benchmark

| Scenario                    | `eslint-plugin-import` | `eslint-plugin-import-next` |
| --------------------------- | ---------------------- | --------------------------- |
| **First run (10k files)**   | ~45s                   | ~45s                        |
| **Subsequent runs**         | ~45s (re-analyzes)     | **~0.4s** (cached)          |
| **Memory (large monorepo)** | 2-4 GB                 | ~500 MB                     |
| **maxDepth: Infinity**      | Often crashes          | ✅ Works                    |

### How It Works

```typescript
// Incremental file-system cache
// Only re-analyzes files that changed
import { clearCircularDependencyCache } from 'eslint-plugin-import-next';

// Clear cache on demand (e.g., for CI fresh runs)
clearCircularDependencyCache();
```

---

## 🔄 Full Compatibility Matrix

Every rule from `eslint-plugin-import` is implemented with **the same name** and **compatible options**:

### ✅ Static Analysis (13 rules)

| Rule                         | CWE | OWASP | CVSS | Description                       | 💼  | ⚠️  | 🔧  | 💡  | 🚫  |
| :--------------------------- | :-: | :---: | :--: | :-------------------------------- | :-: | :-: | :-: | :-: | :-: |
| `no-unresolved`              |     |       |      | Ensure imports resolve            | 💼  |     |     | 💡  |     |
| `named`                      |     |       |      | Ensure named imports exist        | 💼  |     |     |     |     |
| `default`                    |     |       |      | Ensure default export exists      | 💼  |     |     |     |     |
| `namespace`                  |     |       |      | Ensure namespace properties exist | 💼  |     |     |     |     |
| `no-absolute-path`           |     |       |      | Forbid absolute paths             |     |     | 🔧  |     |     |
| `no-dynamic-require`         |     |       |      | Forbid dynamic require()          |     |     |     |     |     |
| `no-internal-modules`        |     |       |      | Enforce entry points only         |     |     |     | 💡  |     |
| `no-relative-packages`       |     |       |      | Use package names                 |     |     | 🔧  |     |     |
| `no-relative-parent-imports` |     |       |      | Prevent `../` imports             |     |     |     |     |     |
| `no-self-import`             |     |       |      | Prevent self-imports              | 💼  |     |     | 💡  |     |
| `no-cycle`                   |     |       |      | **100x faster** cycle detection   | 💼  |     |     | 💡  |     |
| `no-useless-path-segments`   |     |       |      | Simplify paths                    |     |     | 🔧  |     |     |
| `no-restricted-paths`        |     |       |      | Custom path restrictions          |     |     |     |     |     |

### ✅ Helpful Warnings (8 rules)

| Rule                         | CWE | OWASP | CVSS | Description                   | 💼  | ⚠️  | 🔧  | 💡  | 🚫  |
| :--------------------------- | :-: | :---: | :--: | :---------------------------- | :-: | :-: | :-: | :-: | :-: |
| `export`                     |     |       |      | Forbid duplicate exports      | 💼  |     |     |     |     |
| `no-deprecated`              |     |       |      | Warn on `@deprecated` imports |     |     |     |     |     |
| `no-empty-named-blocks`      |     |       |      | Forbid empty `{}` imports     |     |     | 🔧  | 💡  |     |
| `no-extraneous-dependencies` |     |       |      | Prevent unlisted deps         | 💼  |     |     | 💡  |     |
| `no-mutable-exports`         |     |       |      | Forbid `let`/`var` exports    |     |     |     |     |     |
| `no-named-as-default`        |     |       |      | Warn on default shadowing     | 💼  |     |     |     |     |
| `no-named-as-default-member` |     |       |      | Warn on property access       | 💼  |     |     |     |     |
| `no-unused-modules`          |     |       |      | Find dead code                |     |     |     | 💡  |     |

### ✅ Module Systems (5 rules)

| Rule                       | CWE | OWASP | CVSS | Description               | 💼  | ⚠️  | 🔧  | 💡  | 🚫  |
| :------------------------- | :-: | :---: | :--: | :------------------------ | :-: | :-: | :-: | :-: | :-: |
| `no-amd`                   |     |       |      | Forbid AMD require/define |     |     |     |     |     |
| `no-commonjs`              |     |       |      | Forbid CommonJS           |     |     |     |     |     |
| `no-nodejs-modules`        |     |       |      | Forbid Node.js builtins   |     |     |     |     |     |
| `no-import-module-exports` |     |       |      | No mixed ES/CJS           |     |     |     |     |     |
| `unambiguous`              |     |       |      | Warn on ambiguous modules |     |     |     |     |     |

### ✅ Style Guide (17 rules)

| Rule                              | CWE | OWASP | CVSS | Description                       | 💼  | ⚠️  | 🔧  | 💡  | 🚫  |
| :-------------------------------- | :-: | :---: | :--: | :-------------------------------- | :-: | :-: | :-: | :-: | :-: |
| `consistent-type-specifier-style` |     |       |      | Type import style                 |     |     | 🔧  |     |     |
| `dynamic-import-chunkname`        |     |       |      | Require webpack chunk names       |     |     |     | 💡  |     |
| `exports-last`                    |     |       |      | Exports at end of file            |     |     |     |     |     |
| `extensions`                      |     |       |      | Enforce file extension usage      |     |     |     |     |     |
| `first`                           |     |       |      | Imports must be first             |     |     | 🔧  |     |     |
| `group-exports`                   |     |       |      | Group exports together            |     |     |     |     |     |
| `max-dependencies`                |     |       |      | Limit module dependencies         |     |     |     |     |     |
| `newline-after-import`            |     |       |      | Newline after imports             |     |     | 🔧  |     |     |
| `no-anonymous-default-export`     |     |       |      | Require named default exports     |     |     |     |     |     |
| `no-default-export`               |     |       |      | Forbid default exports            |     |     |     | 💡  |     |
| `no-duplicates`                   |     |       |      | Merge duplicate imports           | 💼  |     | 🔧  |     |     |
| `no-named-default`                |     |       |      | Use default import syntax         |     |     |     |     |     |
| `no-named-export`                 |     |       |      | Forbid named exports              |     |     |     |     |     |
| `no-namespace`                    |     |       |      | Forbid `* as` imports             |     |     |     |     |     |
| `no-unassigned-import`            |     |       |      | Forbid side-effect imports        |     |     |     |     |     |
| `order`                           |     |       |      | Sort and group imports            | 💼  |     | 🔧  |     |     |
| `prefer-default-export`           |     |       |      | Prefer default for single exports |     |     |     |     |     |

### 🆕 Exclusive to `import-next` (10 rules)

| Rule                            | CWE | OWASP | CVSS | Description                                         | 💼  | ⚠️  | 🔧  | 💡  | 🚫  |
| :------------------------------ | :-: | :---: | :--: | :-------------------------------------------------- | :-: | :-: | :-: | :-: | :-: |
| `no-cross-domain-imports`       |     |       |      | Enforce clean architecture boundaries               |     |     |     |     |     |
| `enforce-dependency-direction`  |     |       |      | Enforce layered architecture (UI → Services → Data) |     |     |     |     |     |
| `prefer-node-protocol`          |     |       |      | Prefer `node:fs` over `fs`                          |     |     |     |     |     |
| `no-barrel-file`                |     |       |      | Detect barrel files that harm build performance     |     |     |     |     |     |
| `no-barrel-import`              |     |       |      | Flag imports from barrel files                      |     |     |     |     |     |
| `prefer-tree-shakeable-imports` |     |       |      | Enforce tree-shakeable import patterns              |     |     |     |     |     |
| `prefer-direct-import`          |     |       |      | Suggest direct imports with autofix                 |     |     |     |     |     |
| `no-full-package-import`        |     |       |      | Block full imports from large packages              |     |     |     |     |     |
| `enforce-team-boundaries`       |     |       |      | Prevent unauthorized cross-team imports 🔴 NEW      |     |     |     |     |     |
| `no-legacy-imports`             |     |       |      | Detect deprecated imports with autofix 🔴 NEW       |     |     |     |     |     |

---

## 📦 Installation

```bash
npm install --save-dev eslint-plugin-import-next
# or
pnpm add -D eslint-plugin-import-next
```

## 🚀 Quick Start (Flat Config)

```javascript
// eslint.config.js
import importNext from 'eslint-plugin-import-next';

export default [
  // Use recommended preset (most common rules)
  importNext.configs.recommended,

  // Or customize individual rules
  {
    plugins: { 'import-next': importNext },
    rules: {
      'import-next/no-cycle': 'error', // No maxDepth needed!
      'import-next/no-duplicates': 'error',
      'import-next/order': 'warn',
    },
  },
];
```

---

## � Available Presets

| Preset              | Description                                     |
| ------------------- | ----------------------------------------------- |
| `recommended`       | Essential rules for most projects               |
| `strict`            | All rules enabled as errors                     |
| `typescript`        | Optimized for TypeScript projects               |
| `module-resolution` | Focus on import resolution                      |
| `import-style`      | Focus on import formatting                      |
| `esm`               | Enforce ES Modules only                         |
| `architecture`      | Clean architecture boundaries                   |
| `performance`       | Bundle optimization (barrel detection)          |
| `enterprise`        | Team boundaries & legacy import tracking 🔴 NEW |
| `errors`            | Matches eslint-plugin-import errors preset      |
| `warnings`          | Matches eslint-plugin-import warnings preset    |

---

## 🤖 Smart Fixes (LLM-Optimized)

Unlike legacy plugins, we analyze the _type_ of issue and suggest the correct fix:

```bash
# Type-only Cycle
🧩 CWE-407 | Circular Dependency (Types Only)
   Path: auth.ts → user.ts → auth.ts
   Fix: Extract shared types to 'types.ts' or use 'import type'

# Hard Dependency Cycle
🏗️ CWE-407 | Circular Dependency (Runtime)
   Path: ServiceA → ServiceB → ServiceA
   Fix: Use Dependency Injection or split into Core/Extended modules

# Deep Cycle (previously undetectable)
⚠️ CWE-407 | Deep Circular Dependency (depth: 7)
   Path: A → B → C → D → E → F → G → A
   Impact: May cause Vite/Next.js build failures
   Fix: Introduce an abstraction layer between A and G
```

---

## 🤖 LLM & MCP Integration

Optimized for **Cursor**, **GitHub Copilot**, and other AI coding tools:

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

## 🔗 Related Packages

Part of the **Interlace ESLint Ecosystem** — AI-native security plugins with LLM-optimized error messages:

| Plugin | Downloads | Description |
| :--- | :---: | :--- |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) |  |  |
| [`eslint-plugin-jwt`](https://www.npmjs.com/package/eslint-plugin-jwt) |  |  |
| [`eslint-plugin-crypto`](https://www.npmjs.com/package/eslint-plugin-crypto) |  |  |
| [`eslint-plugin-pg`](https://www.npmjs.com/package/eslint-plugin-pg) |  |  |
| [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security) |  |  |
| [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security) |  |  |
| [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security) |  |  |
| [`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security) |  |  |
| [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) |  |  |

---

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)
