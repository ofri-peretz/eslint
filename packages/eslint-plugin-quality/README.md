# eslint-plugin-quality

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Code quality and maintainability standards.
</p>
[![npm version](https://img.shields.io/npm/v/eslint-plugin-quality.svg)](https://www.npmjs.com/package/eslint-plugin-quality)
[![npm downloads](https://img.shields.io/npm/dm/eslint-plugin-quality.svg)](https://www.npmjs.com/package/eslint-plugin-quality)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![codecov](https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=quality)](https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=quality)
[![Dec 2025](https://img.shields.io/badge/Dec_2025-blue?logo=rocket&logoColor=white)](https://github.com/ofri-peretz/eslint)

## Description

> **📘 Full Documentation:** [https://eslint.interlace.tools/docs/quality](https://eslint.interlace.tools/docs/quality)
>
> **Note:** This plugin focuses on **code quality and maintainability** rather than OWASP security. For security rules, see [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding).

> [!TIP]
> For **complete OWASP coverage**, combine with [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) which provides 78 additional rules covering all OWASP categories.

## Philosophy
 
**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

```bash
npm install eslint-plugin-quality --save-dev
```

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Code quality and maintainability standards.
</p>

## Description

## Getting Started

```bash
npm install eslint-plugin-quality --save-dev
```

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Code quality and maintainability standards.
</p>
## Description

## Getting Started

```bash
npm install eslint-plugin-quality --save-dev
```

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Code quality and maintainability standards.
</p>
## Description

## Getting Started

```bash
npm install eslint-plugin-quality --save-dev
```

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Code quality and maintainability standards.
</p>
## Description

## Getting Started

```bash
npm install eslint-plugin-quality --save-dev
```

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

Code quality and maintainability standards.

## Description

## Getting Started

```bash
npm install eslint-plugin-quality --save-dev
```

Code quality and maintainability standards.

## Description

## Getting Started

```bash
npm install eslint-plugin-quality --save-dev
```

---

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

## Rules
| Rule | Tag | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :--- | :---: | :---: | :---: | :--- | :-: | :-: | :-: | :-: | :-: |
|  Rule                      | General |  Tag      |    CWE    |   OWASP   |   CVSS    |  Description  |    💼     |     ⚠️     |                 🔧                  |  💡   |  🚫   |
|  `no-console-log`          | General |  General  |  General  |  General  |  General  |  General      |  General  |  CWE-1078  |  Prevent console.log in production  |  ⚠️   |  🔧   |
|  `cognitive-complexity`    | General |  General  |  General  |  General  |  General  |  General      |  General  |  CWE-1121  |      Limit function complexity      |  💼   |  💡   |
|  `require-error-handling`  | General |  General  |  General  |  General  |  General  |  General      |  General  |  CWE-754   |    Ensure proper error handling     |  ⚠️   |
|  `no-magic-numbers`        | General |  General  |  General  |  General  |  General  |  General      |  General  |  CWE-1078  |       Require named constants       |  ⚠️   |  💡   |

## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint Ecosystem** — AI-native plugins with LLM-optimized error messages:

| Plugin                                                                                     | Downloads | Description |
| :----------------------------------------------------------------------------------------- | :-------: | :---------- |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) |           |             |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next)     |           |             |
| [`eslint-plugin-react-a11y`](https://www.npmjs.com/package/eslint-plugin-react-a11y)       |           |             |

---

## License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<a href="https://eslint.interlace.tools/docs/quality"><img src="https://eslint.interlace.tools/images/interlace-hero.png" alt="ESLint Interlace Plugin" width="100%" /></a>