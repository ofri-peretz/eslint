<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Security validation for JSON Web Tokens (JWT) implementation (signing, verification).
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-jwt" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-jwt.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-jwt" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-jwt.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=jwt" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=jwt" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
</p>

## Description

This plugin provides Security validation for JSON Web Tokens (JWT) implementation (signing, verification).
By using this plugin, you can proactively identify and mitigate security risks across your entire codebase.

## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/security/plugin-jwt), visit [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/security/plugin-jwt), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- [가이드](https://eslint.interlace.tools/docs/security/plugin-jwt) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/security/plugin-jwt)は [eslint.interlace.tools](https://eslint.interlace.tools)でご確認ください。 📚
- Para ver la [guía](https://eslint.interlace.tools/docs/security/plugin-jwt), visita [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- للاطلاع على [الدليل](https://eslint.interlace.tools/docs/security/plugin-jwt)، قم بزيارة [eslint.interlace.tools](https://eslint.interlace.tools). 📚

```bash
npm install eslint-plugin-jwt --save-dev
```

## 💡 What You Get
- **13 Security Rules** - Algorithm attacks, replay prevention, claim validation
- **6 JWT Libraries** - jsonwebtoken, jose, express-jwt, @nestjs/jwt, jwks-rsa, jwt-decode
- **2025 Research** - "Back to the Future" replay attack prevention (LightSEC 2025)
- **AI-Optimized** - Structured messages for GitHub Copilot, Cursor, Claude assistance
- **CWE References** - Every rule maps to Common Weakness Enumeration

## ⚙️ Configuration Presets
| Preset        | Description                                               |
| :------------ | :-------------------------------------------------------- |
| `recommended` | Recommended preset - balanced security                    |
| `strict`      | Strict preset - maximum security (includes 2025 research) |
| `legacy`      | Legacy preset - migration mode                            |
| `all`         | All rules preset                                          |

## 📚 Supported Libraries
| Library        | npm                                                                                                                   | Downloads                                                                                                                    | Detection                       |
| :------------- | :-------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------- | :------------------------------ |
| `jsonwebtoken` | [![npm](https://img.shields.io/npm/v/jsonwebtoken.svg?style=flat-square)](https://www.npmjs.com/package/jsonwebtoken) | [![downloads](https://img.shields.io/npm/dt/jsonwebtoken.svg?style=flat-square)](https://www.npmjs.com/package/jsonwebtoken) | Signing, Verification, Decoding |
| `jose`         | [![npm](https://img.shields.io/npm/v/jose.svg?style=flat-square)](https://www.npmjs.com/package/jose)                 | [![downloads](https://img.shields.io/npm/dt/jose.svg?style=flat-square)](https://www.npmjs.com/package/jose)                 | Verification (Fix Suggestion)   |
| `jwt-decode`   | [![npm](https://img.shields.io/npm/v/jwt-decode.svg?style=flat-square)](https://www.npmjs.com/package/jwt-decode)     | [![downloads](https://img.shields.io/npm/dt/jwt-decode.svg?style=flat-square)](https://www.npmjs.com/package/jwt-decode)     | Unsafe Decoding                 |

## 🤖 AI-Optimized Messages
Every rule uses `formatLLMMessage` for structured output:

```
🔒 CWE-347 OWASP:A02-Crypto CVSS:9.8 | Using alg:"none" bypasses signature verification
   Fix: Remove "none" and use RS256, ES256, or other secure algorithms
   https://nvd.nist.gov/vuln/detail/CVE-2022-23540
```

By providing this structured context (CWE, OWASP, Fix), we enable AI tools to **reason** about the security flaw rather than hallucinating. This allows Copilot/Cursor to suggest the _exact_ correct fix immediately.

By structuring errors with specific CWE codes, OWASP categories, and direct fix suggestions, this format allows AI coding assistants to autonomously identify, explain, and resolve security vulnerabilities with high confidence.

## Rules

**Legend**

| Icon | Description |
| :---: | :--- |
| 💼 | **Recommended**: Included in the recommended preset. |
| ⚠️ | **Warns**: Set towarn in recommended preset. |
| 🔧 | **Auto-fixable**: Automatically fixable by the `--fix` CLI option. |
| 💡 | **Suggestions**: Providing code suggestions in IDE. |
| 🚫 | **Deprecated**: This rule is deprecated. |

| Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| [no-algorithm-confusion](https://eslint.interlace.tools/docs/security/plugin-jwt/rules/no-algorithm-confusion) | CWE-347 | A02:2025 | 9.8 | ESLint rule documentation for no-algorithm-confusion | 💼 |  |  | 💡 |  |
| [no-algorithm-none](https://eslint.interlace.tools/docs/security/plugin-jwt/rules/no-algorithm-none) | CWE-347 | A02:2025 | 9.8 | ESLint rule documentation for no-algorithm-none | 💼 |  |  | 💡 |  |
| [no-decode-without-verify](https://eslint.interlace.tools/docs/security/plugin-jwt/rules/no-decode-without-verify) | CWE-345 | A08:2025 | 7.5 | ESLint rule documentation for no-decode-without-verify | 💼 | ⚠️ |  | 💡 |  |
| [no-hardcoded-secret](https://eslint.interlace.tools/docs/security/plugin-jwt/rules/no-hardcoded-secret) | CWE-798 | A05:2025 | 7.9 | ESLint rule documentation for no-hardcoded-secret | 💼 |  |  | 💡 |  |
| [no-sensitive-payload](https://eslint.interlace.tools/docs/security/plugin-jwt/rules/no-sensitive-payload) | CWE-359 | A01:2025 | 5.3 | ESLint rule documentation for no-sensitive-payload | 💼 | ⚠️ |  | 💡 |  |
| [no-timestamp-manipulation](https://eslint.interlace.tools/docs/security/plugin-jwt/rules/no-timestamp-manipulation) | CWE-294 | A05:2025 | 7.5 | ESLint rule documentation for no-timestamp-manipulation | 💼 |  |  | 💡 |  |
| [no-weak-secret](https://eslint.interlace.tools/docs/security/plugin-jwt/rules/no-weak-secret) | CWE-326 | A02:2025 | 7.5 | ESLint rule documentation for no-weak-secret | 💼 |  |  | 💡 |  |
| [require-algorithm-whitelist](https://eslint.interlace.tools/docs/security/plugin-jwt/rules/require-algorithm-whitelist) | CWE-757 | A02:2025 | 7.5 | ESLint rule documentation for require-algorithm-whitelist | 💼 | ⚠️ |  | 💡 |  |
| [require-audience-validation](https://eslint.interlace.tools/docs/security/plugin-jwt/rules/require-audience-validation) | CWE-287 | A07:2025 | 5.3 | ESLint rule documentation for require-audience-validation |  |  |  | 💡 |  |
| [require-expiration](https://eslint.interlace.tools/docs/security/plugin-jwt/rules/require-expiration) | CWE-613 | A04:2025 | 5.3 | ESLint rule documentation for require-expiration | 💼 | ⚠️ |  | 💡 |  |
| [require-issued-at](https://eslint.interlace.tools/docs/security/plugin-jwt/rules/require-issued-at) | CWE-294 | A04:2025 | 5.3 | ESLint rule documentation for require-issued-at |  |  |  | 💡 |  |
| [require-issuer-validation](https://eslint.interlace.tools/docs/security/plugin-jwt/rules/require-issuer-validation) | CWE-287 | A07:2025 | 5.3 | ESLint rule documentation for require-issuer-validation |  |  |  | 💡 |  |
| [require-max-age](https://eslint.interlace.tools/docs/security/plugin-jwt/rules/require-max-age) | CWE-294 | A04:2025 | 5.3 | ESLint rule documentation for require-max-age |  |  |  | 💡 |  |

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
  <a href="https://eslint.interlace.tools/docs/security/plugin-jwt"><img src="https://eslint.interlace.tools/images/og-jwt.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>