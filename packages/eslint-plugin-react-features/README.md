# eslint-plugin-react-features

> **React hooks, patterns, and migration helpers with LLM-optimized messages.** Enforce React best practices and modernize legacy patterns.

[![npm version](https://img.shields.io/npm/v/eslint-plugin-react-features.svg)](https://www.npmjs.com/package/eslint-plugin-react-features)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![codecov](https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=react_features)](https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=react_features)

---

## 💡 What you get

- **Hooks best practices:** Enforce exhaustive deps, rules of hooks, and custom hook patterns.
- **LLM-optimized & MCP-ready:** Structured 2-line messages with CWE + concrete fixes so humans _and_ AI auto-fixers stay aligned.
- **Migration helpers:** Detect class components and legacy patterns for modern React migration.
- **JSX key enforcement:** Prevent missing keys in lists for optimal reconciliation.
- **Tiered presets:** `recommended`, `strict`, `hooks` for fast policy rollout.

---

## 📊 OWASP Coverage Matrix

> **Note:** This plugin focuses on **React patterns and best practices** rather than OWASP security. For security rules, see [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding).

| Category            | CWE      | Description                            |
| ------------------- | -------- | -------------------------------------- |
| **Performance**     | CWE-1121 | Excessive re-renders from missing deps |
| **Correctness**     | CWE-1078 | Rules of hooks violations              |
| **Maintainability** | CWE-1047 | Legacy patterns requiring migration    |

---

## 📦 Installation

```bash
npm install --save-dev eslint-plugin-react-features
# or
pnpm add -D eslint-plugin-react-features
```

## 🚀 Quick Start

```javascript
// eslint.config.js
import reactFeatures from 'eslint-plugin-react-features';

export default [reactFeatures.configs.recommended];
```

---

## 📋 Rules

💼 = Set in `recommended` | ⚠️ = Warns in `recommended` | 🔧 = Auto-fixable | 💡 = Suggestions

| Rule                    | CWE      | Description                     | 💼  | ⚠️  | 🔧  | 💡  |
| ----------------------- | -------- | ------------------------------- | :-: | :-: | :-: | :-: |
| `jsx-key`               | CWE-1078 | Require key prop in iterators   | 💼  |     |     |     |
| `hooks-exhaustive-deps` | CWE-1121 | Enforce exhaustive dependencies | 💼  |     | 🔧  |     |
| `rules-of-hooks`        | CWE-1078 | Enforce rules of hooks          | 💼  |     |     |     |
| `no-class-components`   | CWE-1047 | Prefer functional components    |     | ⚠️  |     | 💡  |
| `prefer-use-state`      | CWE-1047 | Prefer useState over this.state |     | ⚠️  |     | 💡  |

---

## 🔗 Related ESLint Plugins

Part of the **Forge-JS ESLint Ecosystem** — AI-native plugins with LLM-optimized error messages:

| Plugin                                                                                     | Description                                    | Rules |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------- | :---: |
| [`eslint-plugin-react-a11y`](https://www.npmjs.com/package/eslint-plugin-react-a11y)       | React accessibility (WCAG 2.1)                 |  37   |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) | Universal security (OWASP Top 10 Web + Mobile) |  89   |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next)     | High-performance import linting                |  12   |

---

## License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)
