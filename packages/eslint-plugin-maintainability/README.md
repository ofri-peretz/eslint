<p align="center">
  <a href="https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-maintainability" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Maintainability rules — complexity ceilings, dead code, and readability guardrails.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-maintainability" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-maintainability.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-maintainability" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-maintainability.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=maintainability" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=maintainability" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
</p>

## Description

This plugin provides Maintainability rules — complexity ceilings, dead code, and readability guardrails.

## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/quality/plugin-maintainability?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-maintainability), visit [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-maintainability). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/quality/plugin-maintainability?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-maintainability), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-maintainability). 📚
- [가이드](https://eslint.interlace.tools/docs/quality/plugin-maintainability?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-maintainability) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-maintainability)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/quality/plugin-maintainability?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-maintainability)は [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-maintainability)でご確認ください。 📚
- Para ver la [guía](https://eslint.interlace.tools/docs/quality/plugin-maintainability?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-maintainability), visita [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-maintainability). 📚
- للاطلاع على [الدليل](https://eslint.interlace.tools/docs/quality/plugin-maintainability?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-maintainability)، قم بزيارة [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-maintainability). 📚

```bash
npm install eslint-plugin-maintainability --save-dev
```

## ⚙️ Configuration Presets
| Preset        | Description                                |
| :------------ | :----------------------------------------- |
| `recommended` | Recommended code quality rules as warnings |

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
| [cognitive-complexity](https://eslint.interlace.tools/docs/quality/plugin-maintainability/rules/cognitive-complexity?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-maintainability) |  |  |  | Enforces a maximum cognitive complexity threshold with refactoring guidance | 🟢 |  | ⚠️ |  | 💡 |  |
| [consistent-function-scoping](https://eslint.interlace.tools/docs/quality/plugin-maintainability/rules/consistent-function-scoping?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-maintainability) |  |  |  | Move functions to the highest possible scope | 🟢 |  |  |  | 💡 |  |
| [error-message](https://eslint.interlace.tools/docs/quality/plugin-maintainability/rules/error-message?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-maintainability) |  |  |  | Enforce providing a message when creating built-in Error objects for better debugging | 🟢 |  |  |  | 💡 |  |
| [identical-functions](https://eslint.interlace.tools/docs/quality/plugin-maintainability/rules/identical-functions?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-maintainability) | CWE-1104 |  |  | Detects duplicate function implementations with DRY refactoring suggestions | 🟢 |  | ⚠️ |  | 💡 |  |
| [max-parameters](https://eslint.interlace.tools/docs/quality/plugin-maintainability/rules/max-parameters?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-maintainability) |  |  |  | ESLint Rule: max-parameters with LLM-optimized suggestions and auto-fix capabilities. | 🟢 |  | ⚠️ |  | 💡 |  |
| [nested-complexity-hotspots](https://eslint.interlace.tools/docs/quality/plugin-maintainability/rules/nested-complexity-hotspots?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-maintainability) |  |  |  | ESLint Rule: nested-complexity-hotspots with LLM-optimized suggestions and auto-fix capabilities. | 🟢 |  |  |  | 💡 |  |
| [no-lonely-if](https://eslint.interlace.tools/docs/quality/plugin-maintainability/rules/no-lonely-if?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-maintainability) |  |  |  | Disallow if statements as the only statement in else blocks | 🟢 |  |  |  | 💡 |  |
| [no-missing-error-context](https://eslint.interlace.tools/docs/quality/plugin-maintainability/rules/no-missing-error-context?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-maintainability) |  |  |  | ESLint Rule: no-missing-error-context with LLM-optimized suggestions and auto-fix capabilities. | 🟢 |  |  |  | 💡 |  |
| [no-nested-ternary](https://eslint.interlace.tools/docs/quality/plugin-maintainability/rules/no-nested-ternary?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-maintainability) |  |  |  | Prevent nested ternary expressions for better readability | 🟢 |  |  |  | 💡 |  |
| [no-silent-errors](https://eslint.interlace.tools/docs/quality/plugin-maintainability/rules/no-silent-errors?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-maintainability) |  |  |  | ESLint Rule: no-silent-errors with LLM-optimized suggestions and auto-fix capabilities. | 🟢 |  |  |  | 💡 |  |
| [no-unhandled-promise](https://eslint.interlace.tools/docs/quality/plugin-maintainability/rules/no-unhandled-promise?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-maintainability) | CWE-1024 |  |  | Disallow unhandled Promise rejections with LLM-optimized suggestions for proper async error handling | 🟢 |  |  |  | 💡 |  |
| [no-unreadable-iife](https://eslint.interlace.tools/docs/quality/plugin-maintainability/rules/no-unreadable-iife?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-maintainability) |  |  |  | Disallow unreadable IIFE (Immediately Invoked Function Expression) patterns | 🟢 |  |  |  | 💡 |  |
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

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/quality/plugin-maintainability?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-maintainability"><img src="https://eslint.interlace.tools/images/og-maintainability.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>