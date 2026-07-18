<p align="center">
  <a href="https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Security rules for MongoDB queries and interactions (NoSQL injection).
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-mongodb-security" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-mongodb-security.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-mongodb-security" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-mongodb-security.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=eslint-plugin-mongodb-security" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=eslint-plugin-mongodb-security" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
</p>

> ⭐ If this plugin caught a real bug for you, [**star the repo**](https://github.com/ofri-peretz/eslint) — it's the signal that keeps these rules maintained.

## Description

This plugin provides Security rules for MongoDB queries and interactions (NoSQL injection).

## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/security/plugin-mongodb-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security), visit [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/security/plugin-mongodb-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security). 📚
- [가이드](https://eslint.interlace.tools/docs/security/plugin-mongodb-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/security/plugin-mongodb-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security)は [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security)でご確認ください。 📚
- Para ver la [guía](https://eslint.interlace.tools/docs/security/plugin-mongodb-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security), visita [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security). 📚
- للاطلاع على [الدليل](https://eslint.interlace.tools/docs/security/plugin-mongodb-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security)، قم بزيارة [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security). 📚

```bash
npm install eslint-plugin-mongodb-security --save-dev
```

## ⚙️ Configuration Presets
| Preset        | Description                                       |
| :------------ | :------------------------------------------------ |
| `recommended` | Critical rules as errors, high as warnings        |
| `strict`      | All rules as errors                               |
| `mongoose`    | Specialized rules for Mongoose ODM usage patterns |

## 📚 Supported Libraries
| Library    | npm                                                                                                           | Downloads                                                                                                            | Detection                    |
| ---------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `mongodb`  | [![npm](https://img.shields.io/npm/v/mongodb.svg?style=flat-square)](https://www.npmjs.com/package/mongodb)   | [![downloads](https://img.shields.io/npm/dt/mongodb.svg?style=flat-square)](https://www.npmjs.com/package/mongodb)   | Injection, Unbounded Queries |
| `mongoose` | [![npm](https://img.shields.io/npm/v/mongoose.svg?style=flat-square)](https://www.npmjs.com/package/mongoose) | [![downloads](https://img.shields.io/npm/dt/mongoose.svg?style=flat-square)](https://www.npmjs.com/package/mongoose) | Schema Safety, Leans         |

## 🏢 Usage Examples
### Prevent NoSQL Injection (`no-operator-injection`)

```javascript
// ❌ Incorrect (Vulnerable to { $ne: null })
User.findOne({ email: req.body.email, password: req.body.password });

// ✅ Correct (Safe execution)
User.findOne({ email: { $eq: email }, password: { $eq: password } });
```

### Prevent JavaScript Injection (`no-unsafe-where`)

```javascript
// ❌ Incorrect (Allows RCE)
User.find({ $where: `this.name === '${userInput}'` });

// ✅ Correct (Standard operators)
User.find({ name: { $eq: sanitize(userInput) } });
```

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
| [no-bypass-middleware](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/no-bypass-middleware?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security) | CWE-284 | A01:2021 |  | Detects Mongoose operations that bypass middleware hooks (pre/post hooks). | 🟢 | 💼 |  |  |  |  |
| [no-debug-mode-production](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/no-debug-mode-production?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security) | CWE-489 | A05:2021 |  | Detects Mongoose debug mode that could expose sensitive query information in production. | 🟢 | 💼 |  |  |  |  |
| [no-hardcoded-connection-string](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/no-hardcoded-connection-string?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security) | CWE-798 | A07:2021 |  | Detects hardcoded MongoDB connection strings containing credentials in source code. | 🟢 |  |  |  |  |  |
| [no-hardcoded-credentials](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/no-hardcoded-credentials?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security) | CWE-798 | A07:2021 |  | Detects hardcoded MongoDB authentication credentials in connection options. | 🟢 |  |  |  |  |  |
| [no-operator-injection](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/no-operator-injection?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security) | CWE-943 | A03:2021 |  | Detects MongoDB operator injection attacks where user input is passed directly as query values, allowing at… | 🟢 | 💼 |  |  |  |  |
| [no-select-sensitive-fields](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/no-select-sensitive-fields?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security) | CWE-200 | A01:2021 |  | Detects queries that may return sensitive fields like passwords, tokens, or API keys. | 🟢 | 💼 |  |  |  |  |
| [no-unbounded-find](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/no-unbounded-find?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security) | CWE-400 | A04:2021 |  | Requires limit() on find queries to prevent resource exhaustion from unbounded result sets. | 🟢 |  |  |  |  |  |
| [no-unsafe-populate](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/no-unsafe-populate?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security) | CWE-943 | A03:2021 |  | Detects user-controlled populate() paths that could lead to data exposure or injection. | 🟢 | 💼 |  |  |  |  |
| [no-unsafe-query](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/no-unsafe-query?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security) | CWE-943 | A03:2021 |  | Prevents NoSQL injection by detecting direct use of user input in MongoDB query objects. | 🟢 | 💼 |  |  |  |  |
| [no-unsafe-regex-query](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/no-unsafe-regex-query?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security) | CWE-400 | A03:2021 |  | Detects user input in MongoDB $regex operators that could cause ReDoS (Regular Expression Denial of Service… | 🟢 |  |  |  |  |  |
| [no-unsafe-where](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/no-unsafe-where?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security) | CWE-943 | A01:2021 |  | Prevents use of the dangerous $where operator which executes JavaScript on the MongoDB server, enabling Rem… | 🟢 | 💼 |  |  |  |  |
| [require-auth-mechanism](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/require-auth-mechanism?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security) | CWE-287 | A07:2021 |  | Requires explicit authentication mechanism specification for MongoDB connections. | 🟢 |  |  |  |  |  |
| [require-lean-queries](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/require-lean-queries?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security) | CWE-400 | A04:2021 |  | Suggests using .lean() for read-only Mongoose queries to reduce memory usage. | 🟢 |  | ⚠️ |  |  |  |
| [require-projection](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/require-projection?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security) | CWE-200 | A01:2021 |  | Requires field projection on queries to minimize data exposure. | 🟢 |  |  |  |  |  |
| [require-schema-validation](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/require-schema-validation?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security) | CWE-20 | A04:2021 |  | Requires validation options on Mongoose schema fields to prevent invalid or malicious data. | 🟢 | 💼 |  |  |  |  |
| [require-tls-connection](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/require-tls-connection?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security) | CWE-295 | A02:2021 |  | Requires TLS/SSL encryption for MongoDB connections in production environments. | 🟢 |  |  |  |  |  |
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
  <a href="https://eslint.interlace.tools/docs/security/plugin-mongodb-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mongodb-security"><img src="https://eslint.interlace.tools/images/og-mongodb-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>