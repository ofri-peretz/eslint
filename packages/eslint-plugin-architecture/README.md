# eslint-plugin-architecture

> **Enforce DDD, API boundaries, and project structure with LLM-optimized messages.** Keep your codebase clean with architectural constraints.

[![npm version](https://img.shields.io/npm/v/eslint-plugin-architecture.svg)](https://www.npmjs.com/package/eslint-plugin-architecture)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![codecov](https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=architecture)](https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=architecture)

---

## 💡 What you get

- **DDD enforcement:** Prevent anemic domain models and enforce proper encapsulation.
- **LLM-optimized & MCP-ready:** Structured 2-line messages with CWE + concrete fixes so humans _and_ AI auto-fixers stay aligned.
- **API boundary enforcement:** Ensure modules expose only their public API.
- **Naming conventions:** Enforce consistent naming across your codebase.
- **Tiered presets:** `recommended`, `strict`, `ddd` for fast policy rollout.

---

## 📊 OWASP Coverage Matrix

> **Note:** This plugin focuses on **software architecture and design patterns** rather than OWASP security. For security rules, see [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding).

| Category          | CWE      | Description                           |
| ----------------- | -------- | ------------------------------------- |
| **Design**        | CWE-1047 | Modules with excessive static imports |
| **Encapsulation** | CWE-1061 | Insufficient encapsulation            |
| **Naming**        | CWE-1078 | Inconsistent naming conventions       |

---

## 📦 Installation

```bash
npm install --save-dev eslint-plugin-architecture
# or
pnpm add -D eslint-plugin-architecture
```

## 🚀 Quick Start

```javascript
// eslint.config.js
import architecture from 'eslint-plugin-architecture';

export default [architecture.configs.recommended];
```

---

## 📋 Rules

💼 = Set in `recommended` | ⚠️ = Warns in `recommended` | 🔧 = Auto-fixable | 💡 = Suggestions

| Rule                        | CWE      | Description                          | 💼  | ⚠️  | 🔧  | 💡  |
| --------------------------- | -------- | ------------------------------------ | :-: | :-: | :-: | :-: |
| `enforce-naming`            | CWE-1078 | Enforce naming conventions           | 💼  |     |     |     |
| `ddd-anemic-domain-model`   | CWE-1061 | Prevent anemic domain models         |     | ⚠️  |     | 💡  |
| `enforce-module-boundaries` | CWE-1047 | Enforce API boundaries               | 💼  |     |     |     |
| `no-circular-module-deps`   | CWE-407  | Prevent circular module dependencies | 💼  |     |     | 💡  |

---

## 🔗 Related ESLint Plugins

Part of the **Forge-JS ESLint Ecosystem** — AI-native plugins with LLM-optimized error messages:

| Plugin                                                                                     | Description                                    | Rules |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------- | :---: |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) | Universal security (OWASP Top 10 Web + Mobile) |  89   |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next)     | High-performance import linting                |  12   |
| [`eslint-plugin-quality`](https://www.npmjs.com/package/eslint-plugin-quality)             | Code quality and complexity                    |  10   |

---

## License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)
