# eslint-plugin-architecture

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Security-focused ESLint plugin.
</p>
[![npm version](https://img.shields.io/npm/v/eslint-plugin-architecture.svg)](https://www.npmjs.com/package/eslint-plugin-architecture)
[![npm downloads](https://img.shields.io/npm/dm/eslint-plugin-architecture.svg)](https://www.npmjs.com/package/eslint-plugin-architecture)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![codecov](https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=architecture)](https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=architecture)
[![Dec 2025](https://img.shields.io/badge/Dec_2025-blue?logo=rocket&logoColor=white)](https://github.com/ofri-peretz/eslint)

## Description

> **📘 Full Documentation:** [https://eslint.interlace.tools/docs/architecture](https://eslint.interlace.tools/docs/architecture)
>
> **Note:** This plugin focuses on **software architecture and design patterns** rather than OWASP security. For security rules, see [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding).

> [!TIP]
> For **complete OWASP coverage**, combine with [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) which provides 78 additional rules covering all OWASP categories.

## Philosophy
 
**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

```bash
npm install eslint-plugin-architecture --save-dev
```

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Security-focused ESLint plugin.
</p>

## Description

## Getting Started

```bash
npm install eslint-plugin-architecture --save-dev
```

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Security-focused ESLint plugin.
</p>
## Description

## Getting Started

```bash
npm install eslint-plugin-architecture --save-dev
```

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Security-focused ESLint plugin.
</p>
## Description

## Getting Started

```bash
npm install eslint-plugin-architecture --save-dev
```

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Security-focused ESLint plugin.
</p>
## Description

## Getting Started

```bash
npm install eslint-plugin-architecture --save-dev
```

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

Security-focused ESLint plugin.

## Description

## Getting Started

```bash
npm install eslint-plugin-architecture --save-dev
```

Security-focused ESLint plugin.

## Description

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
|  Rule                         | General |  Tag      |    CWE    |   OWASP   |   CVSS    |  Description  |    💼     |     ⚠️     |                   🔧                   |   💡   |      🚫       |
|  Rule                         | General |  General  |  General  |  General  |  General  |  General      |  General  |    CWE     |                 OWASP                  |  CVSS  |  Description  |  💼   |  ⚠️   |  🔧   |  💡   |  🚫   |
|  `enforce-naming`             | General |  General  |  General  |  General  |  General  |  General      |  General  |  CWE-1078  |       Enforce naming conventions       |   💼   |
|  `ddd-anemic-domain-model`    | General |  General  |  General  |  General  |  General  |  General      |  General  |  CWE-1061  |      Prevent anemic domain models      |   ⚠️   |      💡       |
|  `enforce-module-boundaries`  | General |  General  |  General  |  General  |  General  |  General      |  General  |  CWE-1047  |         Enforce API boundaries         |   💼   |
|  `no-circular-module-deps`    | General |  General  |  General  |  General  |  General  |  General      |  General  |  CWE-407   |  Prevent circular module dependencies  |   💼   |      💡       |

## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint Ecosystem** — AI-native plugins with LLM-optimized error messages:

| Plugin                                                                                     | Downloads | Description |
| :----------------------------------------------------------------------------------------- | :-------: | :---------- |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) |           |             |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next)     |           |             |
| [`eslint-plugin-quality`](https://www.npmjs.com/package/eslint-plugin-quality)             |           |             |

---

## License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<a href="https://eslint.interlace.tools/docs/architecture"><img src="https://eslint.interlace.tools/images/og-architecture.png" alt="ESLint Interlace Plugin" width="100%" /></a>