<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Comprehensive security rules for Express.js applications, mapping to OWASP Top 10.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-express-security" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-express-security.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-express-security" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-express-security.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=express-security" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=express-security" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
</p>

## Description

This plugin provides Comprehensive security rules for Express.js applications, mapping to OWASP Top 10.

## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/security/plugin-express-security), visit [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/security/plugin-express-security), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- [가이드](https://eslint.interlace.tools/docs/security/plugin-express-security) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/security/plugin-express-security)は [eslint.interlace.tools](https://eslint.interlace.tools)でご確認ください。 📚
- Para ver la [guía](https://eslint.interlace.tools/docs/security/plugin-express-security), visita [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- للاطلاع على [الدليل](https://eslint.interlace.tools/docs/security/plugin-express-security)، قم بزيارة [eslint.interlace.tools](https://eslint.interlace.tools). 📚

```bash
npm install eslint-plugin-express-security --save-dev
```

## ⚙️ Configuration Presets
| Preset        | Description                                                             |
| :------------ | :---------------------------------------------------------------------- |
| `recommended` | Balanced security for Express projects (critical as error, others warn) |
| `strict`      | Maximum security enforcement (all rules as errors)                      |
| `api`         | HTTP/API security rules only (CORS, CSRF, cookies, rate limiting)       |
| `graphql`     | GraphQL-specific security rules only                                    |

## 📚 Supported Libraries
| Library   | npm                                                                                                         | Downloads                                                                                                          | Detection                |
| :-------- | :---------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------- | :----------------------- |
| `express` | [![npm](https://img.shields.io/npm/v/express.svg?style=flat-square)](https://www.npmjs.com/package/express) | [![downloads](https://img.shields.io/npm/dt/express.svg?style=flat-square)](https://www.npmjs.com/package/express) | Misconfig, DoS           |
| `helmet`  | [![npm](https://img.shields.io/npm/v/helmet.svg?style=flat-square)](https://www.npmjs.com/package/helmet)   | [![downloads](https://img.shields.io/npm/dt/helmet.svg?style=flat-square)](https://www.npmjs.com/package/helmet)   | Missing Security Headers |
| `cors`    | [![npm](https://img.shields.io/npm/v/cors.svg?style=flat-square)](https://www.npmjs.com/package/cors)       | [![downloads](https://img.shields.io/npm/dt/cors.svg?style=flat-square)](https://www.npmjs.com/package/cors)       | Permissive CORS          |
| `csurf`   | [![npm](https://img.shields.io/npm/v/csurf.svg?style=flat-square)](https://www.npmjs.com/package/csurf)     | [![downloads](https://img.shields.io/npm/dt/csurf.svg?style=flat-square)](https://www.npmjs.com/package/csurf)     | Missing CSRF Protection  |

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
| ⚠️ | **Warns**: Set towarn in recommended preset. |
| 🔧 | **Auto-fixable**: Automatically fixable by the `--fix` CLI option. |
| 💡 | **Suggestions**: Providing code suggestions in IDE. |
| 🚫 | **Deprecated**: This rule is deprecated. |

<!-- AUTO-GENERATED:RULES_TABLE:START - Do not edit manually -->
| Rule | CWE | OWASP | CVSS | Description | 🧠 | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| [no-cors-credentials-wildcard](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/no-cors-credentials-wildcard) | CWE-942 |  |  | The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance: | 🟢 |  |  |  |  |  |
| [no-exposed-debug-endpoints](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/no-exposed-debug-endpoints) | CWE-489 | A05:2021 |  | Identifies potential debug, administration, or testing endpoints that are often left exposed in production… | 🟢 |  |  |  |  |  |
| [no-express-unsafe-regex-route](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/no-express-unsafe-regex-route) | CWE-1333 |  |  | This rule detects Regular Expression Denial of Service (ReDoS) vulnerabilities in Express route patterns | 🟢 |  |  |  |  |  |
| [no-graphql-introspection-production](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/no-graphql-introspection-production) | CWE-200 |  |  | This rule detects GraphQL servers with introspection enabled in production | 🟢 |  |  |  |  |  |
| [no-insecure-cookie-options](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/no-insecure-cookie-options) | CWE-614 |  |  | The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance: | 🟢 | 💼 |  |  |  |  |
| [no-permissive-cors](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/no-permissive-cors) | CWE-942 |  |  | Detects overly permissive CORS configurations in Express.js applications | 🟢 | 💼 |  |  |  |  |
| [require-csrf-protection](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/require-csrf-protection) | CWE-352 |  |  | The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance: | 🟢 | 💼 |  |  |  |  |
| [require-express-body-parser-limits](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/require-express-body-parser-limits) | CWE-400 |  |  | The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance: | 🟢 |  |  |  |  |  |
| [require-helmet](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/require-helmet) | CWE-693 |  |  | This rule detects Express.js applications that are missing the helmet middleware | 🟢 | 💼 |  |  |  |  |
| [require-rate-limiting](https://eslint.interlace.tools/docs/security/plugin-express-security/rules/require-rate-limiting) | CWE-770 |  |  | This rule detects Express.js applications missing rate limiting middleware | 🟢 | 💼 |  |  |  |  |
<!-- AUTO-GENERATED:RULES_TABLE:END -->
## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint Ecosystem** — AI-native security plugins with LLM-optimized error messages:

| Plugin | Downloads | Description |
| :--- | :---: | :--- |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-secure-coding.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-secure-coding) | General security rules & OWASP guidelines. |
| [`eslint-plugin-pg`](https://www.npmjs.com/package/eslint-plugin-pg) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-pg.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-pg) | PostgreSQL security & best practices. |
| [`eslint-plugin-crypto`](https://www.npmjs.com/package/eslint-plugin-crypto) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-crypto.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-crypto) | NodeJS Cryptography security rules. |
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
  <a href="https://eslint.interlace.tools/docs/security/plugin-express-security"><img src="https://eslint.interlace.tools/images/og-express-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>