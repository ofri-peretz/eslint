# eslint-plugin-quality

> **Code quality and error handling rules with LLM-optimized messages.** Enforce cognitive complexity limits, proper error handling, and clean code patterns.

[![npm version](https://img.shields.io/npm/v/eslint-plugin-quality.svg)](https://www.npmjs.com/package/eslint-plugin-quality)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![codecov](https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=quality)](https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=quality)

---

## 💡 What you get

- **Cognitive complexity limits:** Enforce maintainable function complexity with configurable thresholds.
- **LLM-optimized & MCP-ready:** Structured 2-line messages with CWE + concrete fixes so humans _and_ AI auto-fixers stay aligned.
- **Error handling enforcement:** Ensure proper try/catch and error propagation patterns.
- **Clean code patterns:** Detect console.log pollution, magic numbers, and other code smells.
- **Tiered presets:** `recommended`, `strict` for fast policy rollout.

---

## 📊 OWASP Coverage Matrix

> **Note:** This plugin focuses on **code quality and maintainability** rather than OWASP security. For security rules, see [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding).

| Category           | CWE      | Description                    |
| ------------------ | -------- | ------------------------------ |
| **Complexity**     | CWE-1121 | Excessive cognitive complexity |
| **Error Handling** | CWE-754  | Improper error handling        |
| **Code Quality**   | CWE-1078 | Maintainability violations     |

---

## 📦 Installation

```bash
npm install --save-dev eslint-plugin-quality
# or
pnpm add -D eslint-plugin-quality
```

## 🚀 Quick Start

```javascript
// eslint.config.js
import quality from 'eslint-plugin-quality';

export default [quality.configs.recommended];
```

---

## 📋 Rules

💼 = Set in `recommended` | ⚠️ = Warns in `recommended` | 🔧 = Auto-fixable | 💡 = Suggestions

| Rule                     | CWE      | Description                       | 💼  | ⚠️  | 🔧  | 💡  |
| ------------------------ | -------- | --------------------------------- | :-: | :-: | :-: | :-: |
| `no-console-log`         | CWE-1078 | Prevent console.log in production |     | ⚠️  | 🔧  |     |
| `cognitive-complexity`   | CWE-1121 | Limit function complexity         | 💼  |     |     | 💡  |
| `require-error-handling` | CWE-754  | Ensure proper error handling      |     | ⚠️  |     |     |
| `no-magic-numbers`       | CWE-1078 | Require named constants           |     | ⚠️  |     | 💡  |

---

## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint Ecosystem** — AI-native plugins with LLM-optimized error messages:

| Plugin                                                                                     | Description                                    | Rules |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------- | :---: |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) | Universal security (OWASP Top 10 Web + Mobile) |  89   |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next)     | High-performance import linting                |  12   |
| [`eslint-plugin-react-a11y`](https://www.npmjs.com/package/eslint-plugin-react-a11y)       | React accessibility (WCAG 2.1)                 |  37   |

---

## License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)
