# eslint-plugin-react-features

<div align="center">
  <img src="https://eslint.interlace.tools/images/og-features.png" alt="ESLint Interlace - eslint-plugin-react-features" width="200" />
</div>

Advanced React patterns and best practices enforcement.

[![npm version](https://img.shields.io/npm/v/eslint-plugin-react-features.svg)](https://www.npmjs.com/package/eslint-plugin-react-features)
[![npm downloads](https://img.shields.io/npm/dm/eslint-plugin-react-features.svg)](https://www.npmjs.com/package/eslint-plugin-react-features)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![codecov](https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=react-features)](https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=react-features)
[![Dec 2025](https://img.shields.io/badge/Dec_2025-blue?logo=rocket&logoColor=white)](https://github.com/ofri-peretz/eslint)

## Description

> **📘 Full Documentation:** [https://eslint.interlace.tools/docs/react-features](https://eslint.interlace.tools/docs/react-features)
>
> **Note:** This plugin focuses on **React patterns and best practices** rather than OWASP security. For security rules, see [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding).

>
> [!TIP]
> For **complete OWASP coverage**, combine with [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) which provides 78 additional rules covering all OWASP categories.

## Philosophy

Interlace isn't just a set of rules; it's a philosophy of "interlacing" security directly into your development workflow. We believe in tools that guide rather than gatekeep, providing actionable, educational feedback that elevates developer expertise while securing code.

## Getting Started

```bash
npm install eslint-plugin-react-features --save-dev
```

---
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

## Rules
| Rule | Tag | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :--- | :---: | :---: | :---: | :--- | :-: | :-: | :-: | :-: | :-: |
|  `jsx-key`  | General |  CWE-1078  |  Require key prop in iterators  |  💼  |
|  `hooks-exhaustive-deps`  | General |  CWE-1121  |  Enforce exhaustive dependencies  |  💼  |  🔧  |
|  `rules-of-hooks`  | General |  CWE-1078  |  Enforce rules of hooks  |  💼  |
|  `no-class-components`  | General |  CWE-1047  |  Prefer functional components  |  ⚠️  |  💡  |
|  `prefer-use-state`  | General |  CWE-1047  |  Prefer useState over this.state  |  ⚠️  |  💡  |

## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint Ecosystem** — AI-native plugins with LLM-optimized error messages:

| Plugin | Downloads | Description |
| :--- | :---: | :--- |
| [`eslint-plugin-react-a11y`](https://www.npmjs.com/package/eslint-plugin-react-a11y) |  |  |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) |  |  |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next) |  |  |
---

## License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)
