<p align="center">
  <a href="https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Project conventions: naming, file structure, and code style consistency.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-conventions" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-conventions.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-conventions" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-conventions.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=conventions" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=conventions" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
</p>

## Description

This plugin provides Project conventions: naming, file structure, and code style consistency.

## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/quality/plugin-conventions?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions), visit [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/quality/plugin-conventions?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions). 📚
- [가이드](https://eslint.interlace.tools/docs/quality/plugin-conventions?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/quality/plugin-conventions?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions)は [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions)でご確認ください。 📚
- Para ver la [guía](https://eslint.interlace.tools/docs/quality/plugin-conventions?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions), visita [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions). 📚
- للاطلاع على [الدليل](https://eslint.interlace.tools/docs/quality/plugin-conventions?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions)، قم بزيارة [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions). 📚

```bash
npm install eslint-plugin-conventions --save-dev
```

## ⚙️ Configuration Presets
| Preset        | Description                         |
| :------------ | :---------------------------------- |
| `recommended` | Balanced conventions for most teams |

---

## 🏢 Usage Example
```js
// eslint.config.js
import conventions from 'eslint-plugin-conventions';

export default [conventions.configs.recommended];
```

---

## 📦 Compatibility
| Package | Version |
| :--- | :--- |
| ESLint | `^8.0.0 \|\| ^9.0.0 \|\| ^10.0.0` |
| Node.js | `>=18.0.0` |

See the [ESLint Version Support Policy](../../docs/ESLINT_VERSION_SUPPORT.md) — current ecosystem share data, the 20% gate, and the forward-looking exception that covers v10.

## Rules

**Legend**

| Icon | Description |
| :---: | :--- |
| 💼 | **Recommended**: Included in the recommended preset. |
| ⚠️ | **Warns**: Set to warn in recommended preset. |
| 🔧 | **Auto-fixable**: Automatically fixable by the `--fix` CLI option. |
| 💡 | **Suggestions**: Providing code suggestions in IDE. |
| 🚫 | **Deprecated**: This rule is deprecated. |
| 🟢 | **Type-unaware**: AST-only, runs in oxlint JS-plugin tier. |
| 🟡 | **Type-aware (refining)**: pure-AST primary path; types refine precision. |
| 🟠 | **Type-aware (graceful)**: requires TS program; silent without it. |

<!-- AUTO-GENERATED:RULES_TABLE:START - Do not edit manually -->
| Rule | CWE | OWASP | CVSS | Description | 🧠 | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| [consistent-existence-index-check](https://eslint.interlace.tools/docs/quality/plugin-conventions/rules/consistent-existence-index-check?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions) |  |  |  | Enforce consistent style for checking if an element exists in an array | 🟢 |  |  |  | 💡 |  |
| [expiring-todo-comments](https://eslint.interlace.tools/docs/quality/plugin-conventions/rules/expiring-todo-comments?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions) |  |  |  | Add expiration conditions to TODO comments to prevent forgotten tasks. This rule is part of eslint-plugin-c… | 🟢 |  | ⚠️ |  | 💡 |  |
| [filename-case](https://eslint.interlace.tools/docs/quality/plugin-conventions/rules/filename-case?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions) |  |  |  | Enforce filename case conventions for consistency across your codebase | 🟢 |  |  |  | 💡 |  |
| [no-commented-code](https://eslint.interlace.tools/docs/quality/plugin-conventions/rules/no-commented-code?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions) |  |  |  | ESLint Rule: no-commented-code with LLM-optimized suggestions and auto-fix capabilities. | 🟢 |  | ⚠️ |  | 💡 |  |
| [no-console-spaces](https://eslint.interlace.tools/docs/quality/plugin-conventions/rules/no-console-spaces?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions) |  |  |  | Disallow leading/trailing whitespace in console arguments. This rule is part of eslint-plugin-conventions. | 🟢 |  |  |  | 💡 |  |
| [no-deprecated-api](https://eslint.interlace.tools/docs/quality/plugin-conventions/rules/no-deprecated-api?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions) | CWE-1078 |  |  | Prevent usage of deprecated APIs with migration context and timeline. This rule is part of eslint-plugin-co… | 🟢 |  | ⚠️ |  | 💡 |  |
| [no-json-schema-tags](https://eslint.interlace.tools/docs/quality/plugin-conventions/rules/no-json-schema-tags?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions) |  |  |  | Disallow JSON Schema keywords (e.g. @minimum, @maximum, @pattern, @format) used as JSDoc tags. | 🟢 |  |  |  | 💡 |  |
| [prefer-code-point](https://eslint.interlace.tools/docs/quality/plugin-conventions/rules/prefer-code-point?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions) |  |  |  | Prefer String.codePointAt() over String.charCodeAt(). This rule is part of eslint-plugin-conventions. | 🟢 |  |  |  | 💡 |  |
| [prefer-dependency-version-strategy](https://eslint.interlace.tools/docs/quality/plugin-conventions/rules/prefer-dependency-version-strategy?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions) |  |  |  | Enforce consistent version strategy (caret ^, tilde ~, exact, range, or any) for package.json dependencies.… | 🟢 |  |  |  | 💡 |  |
| [prefer-dom-node-text-content](https://eslint.interlace.tools/docs/quality/plugin-conventions/rules/prefer-dom-node-text-content?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions) |  |  |  | Prefer textContent over innerText. This rule is part of eslint-plugin-conventions. | 🟢 |  |  |  | 💡 |  |
| [require-data-testid](https://eslint.interlace.tools/docs/quality/plugin-conventions/rules/require-data-testid?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions) |  |  |  | Require stable data-testid attributes on interactive elements for end-to-end test reliability | 🟢 |  |  |  | 💡 |  |
<!-- AUTO-GENERATED:RULES_TABLE:END -->
## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint Ecosystem** — AI-native security plugins with LLM-optimized error messages:

| Plugin | Downloads | Description |
| :--- | :---: | :--- |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-secure-coding.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-secure-coding) | General security rules & OWASP guidelines. |
| [`eslint-plugin-pg`](https://www.npmjs.com/package/eslint-plugin-pg) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-pg.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-pg) | PostgreSQL security & best practices. |
| [`eslint-plugin-node-security`](https://www.npmjs.com/package/eslint-plugin-node-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-node-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-node-security) | Node.js core-module security (fs, child_process, vm, crypto, Buffer). |
| [`eslint-plugin-jwt`](https://www.npmjs.com/package/eslint-plugin-jwt) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-jwt.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-jwt) | JWT security & best practices. |
| [`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-browser-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-browser-security) | Browser-specific security & XSS prevention. |
| [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-express-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-express-security) | Express.js security hardening rules. |
| [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-lambda-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-lambda-security) | AWS Lambda security best practices. |
| [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-nestjs-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | NestJS security rules & patterns. |
| [`eslint-plugin-mongodb-security`](https://www.npmjs.com/package/eslint-plugin-mongodb-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-mongodb-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-mongodb-security) | MongoDB security best practices. |
| [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-vercel-ai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | Vercel AI SDK security hardening. |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-import-next.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import-next) | Next-gen import sorting & architecture. |

<!-- INTERLACE:STAR_CTA:START -->
## ⭐ Support & follow

If this plugin caught a real bug for you, **[star the repo](https://github.com/ofri-peretz/eslint)** — stars are the signal that keeps the Interlace ESLint ecosystem maintained — and **[follow the writeups on Dev.to](https://dev.to/ofri-peretz)** for the benchmarks and security research behind these rules.

[![GitHub stars](https://img.shields.io/github/stars/ofri-peretz/eslint?style=social)](https://github.com/ofri-peretz/eslint)

<!-- INTERLACE:STAR_CTA:END -->

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/quality/plugin-conventions?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-conventions"><img src="https://eslint.interlace.tools/images/og-conventions.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>