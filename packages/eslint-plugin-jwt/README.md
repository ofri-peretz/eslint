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
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Dec_2025-blue?logo=rocket&logoColor=white" alt="Dec 2025" /></a>
</p>

## Description

Security validation for JSON Web Tokens (JWT) implementation (signing, verification).

## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/jwt), visit [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/jwt), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- [가이드](https://eslint.interlace.tools/docs/jwt) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/jwt)は [eslint.interlace.tools](https://eslint.interlace.tools)でご確認ください。 📚

```bash
npm install eslint-plugin-jwt --save-dev
```

## 💡 What You Get
- **13 Security Rules** - Algorithm attacks, replay prevention, claim validation
- **6 JWT Libraries** - jsonwebtoken, jose, express-jwt, @nestjs/jwt, jwks-rsa, jwt-decode
- **2025 Research** - "Back to the Future" replay attack prevention (LightSEC 2025)
- **AI-Optimized** - Structured messages for GitHub Copilot, Cursor, Claude assistance
- **CWE References** - Every rule maps to Common Weakness Enumeration

## 🔐 OWASP Top 10 2025 Coverage
| OWASP Category                         |                                             Rules                                              | Coverage |
| -------------------------------------- | :--------------------------------------------------------------------------------------------: | :------: |
| **A01:2025 Broken Access Control**     |                   `require-audience-validation`, `require-issuer-validation`                   |    ✅    |
| **A02:2025 Cryptographic Failures**    | `no-algorithm-none`, `no-algorithm-confusion`, `no-weak-secret`, `require-algorithm-whitelist` |    ✅    |
| **A04:2025 Insecure Design**           |              `no-decode-without-verify`, `require-expiration`, `require-max-age`               |    ✅    |
| **A05:2025 Security Misconfiguration** |                       `no-hardcoded-secret`, `no-timestamp-manipulation`                       |    ✅    |
| **A07:2025 Identification Failures**   |                   `require-issuer-validation`, `require-audience-validation`                   |    ✅    |
| **A08:2025 Software/Data Integrity**   |           `no-algorithm-none`, `no-algorithm-confusion`, `no-decode-without-verify`            |    ✅    |

## ⚙️ Configuration Presets
| Preset        | Description | Rule | CWE | OWASP | CVSS | Description | 💼  | ⚠️  | 🔧  | 💡  | 🚫  |
| :------------ | :---------: | :--: | :-: | :---- | :--: | :---------: | :-: | :-: | :-: | --- | --- |
| `recommended` |             |      |     |       |      |             |     |     |     |
| `strict`      |             |      |     |       |      |             |     |     |     |
| `legacy`      |             |      |     |       |      |             |     |     |     |

## 📚 Supported Libraries
| Library | npm | Detection |
| ------- | --- | --------- |

## 🤖 AI-Optimized Messages
Every rule uses `formatLLMMessage` for structured output:

```
🔒 CWE-347 OWASP:A02-Crypto CVSS:9.8 | Using alg:"none" bypasses signature verification
   Fix: Remove "none" and use RS256, ES256, or other secure algorithms
   https://nvd.nist.gov/vuln/detail/CVE-2022-23540
```

## 📖 References
- [RFC 8725 - JWT Best Current Practices](https://tools.ietf.org/html/rfc8725)
- [CVE-2022-23540 - jsonwebtoken algorithm none](https://nvd.nist.gov/vuln/detail/CVE-2022-23540)
- [CVE-2025-30204 - golang-jwt DoS](https://nvd.nist.gov/vuln/detail/CVE-2025-30204)
- [LightSEC 2025 - "Back to the Future" Attack](https://securitypattern.com/post/jwt-back-to-the-future)
- [PortSwigger - JWT Algorithm Confusion](https://portswigger.net/web-security/jwt/algorithm-confusion)
- [OWASP JWT Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)

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
| [OWASP](https://eslint.interlace.tools/docs/jwt/rules/OWASP) |  |  |  | OWASP Category |  |  |  |  |  |
| [Library](https://eslint.interlace.tools/docs/jwt/rules/Library) |  |  |  | Detection |  |  |  |  |  |
| [no-algorithm-none](https://eslint.interlace.tools/docs/jwt/rules/no-algorithm-none) | CWE-347 | A02:2025 | 9.8 | [no-algorithm-none](docs/rules/no-algorithm-none.md) | 💼 |  |  | 💡 |  |
| [no-algorithm-confusion](https://eslint.interlace.tools/docs/jwt/rules/no-algorithm-confusion) | CWE-347 | A02:2025 | 9.8 | [no-algorithm-confusion](docs/rules/no-algorithm-confusion.md) | 💼 |  |  | 💡 |  |
| [require-algorithm-whitelist](https://eslint.interlace.tools/docs/jwt/rules/require-algorithm-whitelist) | CWE-757 | A02:2025 | 7.5 | [require-algorithm-whitelist](docs/rules/require-algorithm-whitelist.md) | 💼 |  |  | 💡 |  |
| [no-decode-without-verify](https://eslint.interlace.tools/docs/jwt/rules/no-decode-without-verify) | CWE-345 | A08:2025 | 7.5 | [no-decode-without-verify](docs/rules/no-decode-without-verify.md) | 💼 |  |  | 💡 |  |
| [no-weak-secret](https://eslint.interlace.tools/docs/jwt/rules/no-weak-secret) | CWE-326 | A02:2025 | 7.5 | [no-weak-secret](docs/rules/no-weak-secret.md) | 💼 |  |  | 💡 |  |
| [no-hardcoded-secret](https://eslint.interlace.tools/docs/jwt/rules/no-hardcoded-secret) | CWE-798 | A05:2025 | 7.9 | [no-hardcoded-secret](docs/rules/no-hardcoded-secret.md) | 💼 |  |  | 💡 |  |
| [no-timestamp-manipulation](https://eslint.interlace.tools/docs/jwt/rules/no-timestamp-manipulation) | CWE-294 | A05:2025 | 7.5 | [no-timestamp-manipulation](docs/rules/no-timestamp-manipulation.md) | 💼 |  |  | 💡 |  |
| [require-expiration](https://eslint.interlace.tools/docs/jwt/rules/require-expiration) | CWE-613 | A04:2025 | 5.3 | [require-expiration](docs/rules/require-expiration.md) | 💼 |  |  | 💡 |  |
| [require-issued-at](https://eslint.interlace.tools/docs/jwt/rules/require-issued-at) | CWE-294 | A04:2025 | 5.3 | [require-issued-at](docs/rules/require-issued-at.md) | 💼 |  |  | 💡 |  |
| [require-issuer-validation](https://eslint.interlace.tools/docs/jwt/rules/require-issuer-validation) | CWE-287 | A07:2025 | 5.3 | [require-issuer-validation](docs/rules/require-issuer-validation.md) | 💼 |  |  | 💡 |  |
| [require-audience-validation](https://eslint.interlace.tools/docs/jwt/rules/require-audience-validation) | CWE-287 | A07:2025 | 5.3 | [require-audience-validation](docs/rules/require-audience-validation.md) | 💼 |  |  | 💡 |  |
| [require-max-age](https://eslint.interlace.tools/docs/jwt/rules/require-max-age) | CWE-294 | A04:2025 | 5.3 | [require-max-age](docs/rules/require-max-age.md) | 💼 |  |  | 💡 |  |
| [no-sensitive-payload](https://eslint.interlace.tools/docs/jwt/rules/no-sensitive-payload) | CWE-359 | A01:2025 | 5.3 | [no-sensitive-payload](docs/rules/no-sensitive-payload.md) | 💼 |  |  | 💡 |  |

## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint Ecosystem** — AI-native security plugins with LLM-optimized error messages:

| Plugin | NPM | Downloads | License | Description |
| :--- | :---: | :---: | :---: | :--- |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) | [![npm](https://img.shields.io/npm/v/eslint-plugin-secure-coding.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-secure-coding) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-secure-coding.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-secure-coding) | [![license](https://img.shields.io/npm/l/eslint-plugin-secure-coding.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-secure-coding) | General security rules & OWASP guidelines. |
| [`eslint-plugin-pg`](https://www.npmjs.com/package/eslint-plugin-pg) | [![npm](https://img.shields.io/npm/v/eslint-plugin-pg.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-pg) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-pg.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-pg) | [![license](https://img.shields.io/npm/l/eslint-plugin-pg.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-pg) | PostgreSQL security & best practices. |
| [`eslint-plugin-crypto`](https://www.npmjs.com/package/eslint-plugin-crypto) | [![npm](https://img.shields.io/npm/v/eslint-plugin-crypto.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-crypto) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-crypto.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-crypto) | [![license](https://img.shields.io/npm/l/eslint-plugin-crypto.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-crypto) | NodeJS Cryptography security rules. |
| [`eslint-plugin-jwt`](https://www.npmjs.com/package/eslint-plugin-jwt) | [![npm](https://img.shields.io/npm/v/eslint-plugin-jwt.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-jwt) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-jwt.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-jwt) | [![license](https://img.shields.io/npm/l/eslint-plugin-jwt.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-jwt) | JWT security & best practices. |
| [`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security) | [![npm](https://img.shields.io/npm/v/eslint-plugin-browser-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-browser-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-browser-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-browser-security) | [![license](https://img.shields.io/npm/l/eslint-plugin-browser-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-browser-security) | Browser-specific security & XSS prevention. |
| [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | [![npm](https://img.shields.io/npm/v/eslint-plugin-vercel-ai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-vercel-ai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | [![license](https://img.shields.io/npm/l/eslint-plugin-vercel-ai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | Vercel AI SDK security rules. |
| [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security) | [![npm](https://img.shields.io/npm/v/eslint-plugin-express-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-express-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-express-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-express-security) | [![license](https://img.shields.io/npm/l/eslint-plugin-express-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-express-security) | Express.js security hardening rules. |
| [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security) | [![npm](https://img.shields.io/npm/v/eslint-plugin-lambda-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-lambda-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-lambda-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-lambda-security) | [![license](https://img.shields.io/npm/l/eslint-plugin-lambda-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-lambda-security) | AWS Lambda security best practices. |
| [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | [![npm](https://img.shields.io/npm/v/eslint-plugin-nestjs-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-nestjs-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | [![license](https://img.shields.io/npm/l/eslint-plugin-nestjs-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | NestJS security rules & patterns. |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next) | [![npm](https://img.shields.io/npm/v/eslint-plugin-import-next.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import-next) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-import-next.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import-next) | [![license](https://img.shields.io/npm/l/eslint-plugin-import-next.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import-next) | Next-gen import sorting & architecture. |

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/jwt"><img src="https://eslint.interlace.tools/images/og-jwt.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>