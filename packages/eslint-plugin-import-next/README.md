<p align="center">
  <a href="https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Next-generation import sorting, validation, and architectural boundaries.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-import-next" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-import-next.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-import-next" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-import-next.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=import-next" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=import-next" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
</p>

> ⭐ If this plugin caught a real bug for you, [**star the repo**](https://github.com/ofri-peretz/eslint) — it's the signal that keeps these rules maintained.

## Description

This plugin provides Next-generation import sorting, validation, and architectural boundaries.

## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/quality/plugin-import-next?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next), visit [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/quality/plugin-import-next?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next). 📚
- [가이드](https://eslint.interlace.tools/docs/quality/plugin-import-next?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/quality/plugin-import-next?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next)は [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next)でご確認ください。 📚
- Para ver la [guía](https://eslint.interlace.tools/docs/quality/plugin-import-next?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next), visita [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next). 📚
- للاطلاع على [الدليل](https://eslint.interlace.tools/docs/quality/plugin-import-next?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next)، قم بزيارة [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next). 📚

```bash
npm install eslint-plugin-import-next --save-dev
```

## ⚙️ Configuration Presets
| Preset              | Description                                      |
| :------------------ | :----------------------------------------------- |
| `recommended`       | Warns on import order issues                     |
| `strict`            | All rules set to error for production-ready code |
| `typescript`        | Optimized for TypeScript projects                |
| `module-resolution` | Focus on import resolution                       |
| `import-style`      | Focus on import formatting                       |
| `esm`               | Enforce ES Modules only                          |
| `architecture`      | Clean architecture boundaries                    |
| `performance`       | Bundle optimization (barrel detection)           |
| `enterprise`        | Team boundaries & legacy import tracking         |
| `errors`            | Matches eslint-plugin-import errors preset       |
| `warnings`          | Matches eslint-plugin-import warnings preset     |

## 🔄 Parity with `eslint-plugin-import`
| Rule      | Original Plugin                                                                                                                                                                                                    | Status       | Notes                    |
| :-------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------- | :----------------------- |
| All Rules | [`eslint-plugin-import`](https://www.npmjs.com/package/eslint-plugin-import) [![npm](https://img.shields.io/npm/v/eslint-plugin-import.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import) | ✅ Supported | Full drop-in replacement |

## 📦 Compatibility
| Package | Version |
| :--- | :--- |
| ESLint | `^8.0.0 \|\| ^9.0.0 \|\| ^10.0.0` |
| Node.js | `>=18.0.0` |

See the [ESLint Version Support Policy](../../docs/ESLINT_VERSION_SUPPORT.md) for the full matrix.

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
| [consistent-type-specifier-style](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/consistent-type-specifier-style?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  |  |  |  |  |
| [default](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/default?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟡 | 💼 |  |  |  |  |
| [dynamic-import-chunkname](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/dynamic-import-chunkname?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  |  |  |  |  |
| [enforce-dependency-direction](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/enforce-dependency-direction?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  |  |  |  |  |
| [enforce-import-order](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/enforce-import-order?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  |  |  |  |  |
| [enforce-team-boundaries](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/enforce-team-boundaries?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  |  |  |  |  |
| [export](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/export?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 | 💼 |  |  |  |  |
| [exports-last](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/exports-last?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  |  |  |  |  |
| [extensions](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/extensions?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  |  |  |  |  |
| [first](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/first?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  | ⚠️ |  |  |  |
| [group-exports](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/group-exports?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  |  |  |  |  |
| [max-dependencies](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/max-dependencies?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  |  |  |  |  |
| [named](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/named?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟡 | 💼 |  |  |  |  |
| [namespace](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/namespace?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟡 |  | ⚠️ |  |  |  |
| [newline-after-import](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/newline-after-import?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  | ⚠️ |  |  |  |
| [no-absolute-path](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-absolute-path?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  |  |  |  |  |
| [no-amd](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-amd?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  | ⚠️ |  |  |  |
| [no-anonymous-default-export](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-anonymous-default-export?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  |  |  |  |  |
| [no-barrel-file](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-barrel-file?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  |  |  |  |  |
| [no-barrel-import](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-barrel-import?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  |  |  |  |  |
| [no-commonjs](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-commonjs?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  |  |  |  |  |
| [no-cross-domain-imports](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-cross-domain-imports?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  |  |  |  |  |
| [no-cycle](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-cycle?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  | A05:2021 |  |  | 🟢 | 💼 |  |  |  |  |
| [no-default-export](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-default-export?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  |  |  |  |  |
| [no-deprecated](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-deprecated?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  | A09:2021 |  |  | 🟢 |  |  |  |  |  |
| [no-duplicates](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-duplicates?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 | 💼 |  |  |  |  |
| [no-dynamic-require](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-dynamic-require?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  |  |  |  |  |
| [no-empty-named-blocks](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-empty-named-blocks?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  | ⚠️ |  |  |  |
| [no-extraneous-dependencies](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-extraneous-dependencies?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  | ⚠️ |  |  |  |
| [no-full-package-import](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-full-package-import?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  |  |  |  |  |
| [no-import-module-exports](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-import-module-exports?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  |  |  |  |  |
| [no-internal-modules](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-internal-modules?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  |  |  |  |  |
| [no-legacy-imports](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-legacy-imports?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  |  |  |  |  |
| [no-mutable-exports](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-mutable-exports?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  |  |  |  |  |
| [no-named-as-default](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-named-as-default?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  | ⚠️ |  |  |  |
| [no-named-as-default-member](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-named-as-default-member?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  | ⚠️ |  |  |  |
| [no-named-default](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-named-default?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  |  |  |  |  |
| [no-named-export](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-named-export?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  |  |  |  |  |
| [no-namespace](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-namespace?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  |  |  |  |  |
| [no-nodejs-modules](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-nodejs-modules?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  |  |  |  |  |
| [no-relative-packages](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-relative-packages?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  |  |  |  |  |
| [no-relative-parent-imports](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-relative-parent-imports?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  |  |  |  |  |
| [no-restricted-paths](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-restricted-paths?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  |  |  |  |  |
| [no-self-import](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-self-import?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 | 💼 |  |  |  |  |
| [no-unassigned-import](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-unassigned-import?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  |  |  |  |  |
| [no-unresolved](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-unresolved?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  | A03:2021 |  |  | 🟢 | 💼 |  |  |  |  |
| [no-unused-modules](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-unused-modules?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  |  |  |  |  |
| [no-useless-path-segments](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/no-useless-path-segments?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  |  |  |  |  |
| [order](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/order?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  | ⚠️ |  |  |  |
| [prefer-default-export](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/prefer-default-export?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  |  |  |  |  |
| [prefer-direct-import](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/prefer-direct-import?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  |  |  |  |  |
| [prefer-modern-api](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/prefer-modern-api?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  |  |  |  |  |
| [prefer-node-protocol](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/prefer-node-protocol?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  |  |  |  |  |
| [prefer-tree-shakeable-imports](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/prefer-tree-shakeable-imports?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  |  |  |  |  |
| [require-import-approval](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/require-import-approval?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  |  |  |  |  |
| [unambiguous](https://eslint.interlace.tools/docs/quality/plugin-import-next/rules/unambiguous?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next) |  |  |  |  | 🟢 |  |  |  |  |  |
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
  <a href="https://eslint.interlace.tools/docs/quality/plugin-import-next?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-import-next"><img src="https://eslint.interlace.tools/images/og-import-next.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>