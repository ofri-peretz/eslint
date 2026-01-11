# eslint-plugin-architecture

<div align="center">
  <img src="https://eslint.interlace.tools/images/og-architecture.png" alt="ESLint Interlace - eslint-plugin-architecture" width="200" />
</div>

Security-focused ESLint plugin.

[![npm version](https://img.shields.io/npm/v/eslint-plugin-architecture.svg)](https://www.npmjs.com/package/eslint-plugin-architecture)
[![npm downloads](https://img.shields.io/npm/dm/eslint-plugin-architecture.svg)](https://www.npmjs.com/package/eslint-plugin-architecture)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![codecov](https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=architecture)](https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=architecture)
[![Dec 2025](https://img.shields.io/badge/Dec_2025-blue?logo=rocket&logoColor=white)](https://github.com/ofri-peretz/eslint)

## Description

> **📘 Full Documentation:** [https://eslint.interlace.tools/docs/architecture](https://eslint.interlace.tools/docs/architecture)
>
> **Note:** This plugin focuses on **software architecture and design patterns** rather than OWASP security. For security rules, see [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding).

>
> [!TIP]
> For **complete OWASP coverage**, combine with [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) which provides 78 additional rules covering all OWASP categories.

## Philosophy

Interlace isn't just a set of rules; it's a philosophy of "interlacing" security directly into your development workflow. We believe in tools that guide rather than gatekeep, providing actionable, educational feedback that elevates developer expertise while securing code.

## Getting Started

```bash
npm install eslint-plugin-architecture --save-dev
```

---
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

## Rules
| Rule | Tag | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :--- | :---: | :---: | :---: | :--- | :-: | :-: | :-: | :-: | :-: |
|  Rule                         | General |    CWE     |  OWASP  |  CVSS  |  Description                           |  💼   |  ⚠️   |  🔧   |  💡   |  🚫   |
|  `enforce-naming`             | General |  CWE-1078  |  Enforce naming conventions            |  💼   |
|  `ddd-anemic-domain-model`    | General |  CWE-1061  |  Prevent anemic domain models          |  ⚠️   |  💡   |
|  `enforce-module-boundaries`  | General |  CWE-1047  |  Enforce API boundaries                |  💼   |
|  `no-circular-module-deps`    | General |  CWE-407   |  Prevent circular module dependencies  |  💼   |  💡   |

## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint Ecosystem** — AI-native plugins with LLM-optimized error messages:

| Plugin | Downloads | Description |
| :--- | :---: | :--- |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) |  |  |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next) |  |  |
| [`eslint-plugin-quality`](https://www.npmjs.com/package/eslint-plugin-quality) |  |  |

---

## License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)
