<p align="center">
  <a href="https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Security validation for JSON Web Tokens (JWT) implementation (signing, verification).
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-jwt" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-jwt.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-jwt" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-jwt.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=eslint-plugin-jwt" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=eslint-plugin-jwt" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
</p>

> ⭐ If this plugin caught a real bug for you, [**star the repo**](https://github.com/ofri-peretz/eslint) — it's the signal that keeps these rules maintained.

## Description

This plugin provides Security validation for JSON Web Tokens (JWT) implementation (signing, verification).

## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/security/plugin-jwt?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt), visit [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/security/plugin-jwt?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt). 📚
- [가이드](https://eslint.interlace.tools/docs/security/plugin-jwt?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/security/plugin-jwt?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt)は [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt)でご確認ください。 📚
- Para ver la [guía](https://eslint.interlace.tools/docs/security/plugin-jwt?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt), visita [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt). 📚
- للاطلاع على [الدليل](https://eslint.interlace.tools/docs/security/plugin-jwt?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt)، قم بزيارة [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt). 📚

```bash
npm install eslint-plugin-jwt --save-dev
```

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

## 💡 What You Get
- **13 Security Rules** - Algorithm attacks, replay prevention, claim validation
- **6 JWT Libraries** - jsonwebtoken, jose, express-jwt, @nestjs/jwt, jwks-rsa, jwt-decode
- **2025 Research** - "Back to the Future" replay attack prevention (LightSEC 2025)
- **AI-Optimized** - Structured messages for GitHub Copilot, Cursor, Claude assistance
- **CWE References** - Every rule maps to Common Weakness Enumeration

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
| [no-algorithm-confusion](https://eslint.interlace.tools/docs/security/plugin-jwt/rules/no-algorithm-confusion?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt) | CWE-347 |  |  | This rule detects algorithm confusion attacks where symmetric algorithms (HS256, HS384, HS512) are used wit… | 🟢 |  |  |  |  |  |
| [no-algorithm-none](https://eslint.interlace.tools/docs/security/plugin-jwt/rules/no-algorithm-none?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt) | CWE-347 |  |  | This rule detects attempts to use the none algorithm which completely bypasses JWT signature verification | 🟢 |  |  |  |  |  |
| [no-decode-without-verify](https://eslint.interlace.tools/docs/security/plugin-jwt/rules/no-decode-without-verify?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt) | CWE-345 |  |  | The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance: | 🟢 |  |  |  |  |  |
| [no-hardcoded-secret](https://eslint.interlace.tools/docs/security/plugin-jwt/rules/no-hardcoded-secret?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt) | CWE-798 |  |  | The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance: | 🟢 |  |  |  |  |  |
| [no-sensitive-payload](https://eslint.interlace.tools/docs/security/plugin-jwt/rules/no-sensitive-payload?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt) | CWE-359 |  |  | JWT payloads are NOT encrypted, only base64-encoded | 🟢 |  |  |  |  |  |
| [no-timestamp-manipulation](https://eslint.interlace.tools/docs/security/plugin-jwt/rules/no-timestamp-manipulation?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt) | CWE-294 |  |  | This rule detects noTimestamp: true which disables automatic iat (issued at) claim generation | 🟢 |  |  |  |  |  |
| [no-weak-secret](https://eslint.interlace.tools/docs/security/plugin-jwt/rules/no-weak-secret?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt) | CWE-326 |  |  | The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance: | 🟢 |  |  |  |  |  |
| [require-algorithm-whitelist](https://eslint.interlace.tools/docs/security/plugin-jwt/rules/require-algorithm-whitelist?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt) | CWE-757 |  |  | This rule enforces explicit algorithm specification in verify() calls | 🟢 |  |  |  |  |  |
| [require-audience-validation](https://eslint.interlace.tools/docs/security/plugin-jwt/rules/require-audience-validation?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt) | CWE-287 |  |  | The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance: | 🟢 |  |  |  |  |  |
| [require-expiration](https://eslint.interlace.tools/docs/security/plugin-jwt/rules/require-expiration?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt) | CWE-613 |  |  | The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance: | 🟢 |  |  |  |  |  |
| [require-issued-at](https://eslint.interlace.tools/docs/security/plugin-jwt/rules/require-issued-at?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt) | CWE-294 |  |  | This rule ensures tokens have the iat claim for freshness validation | 🟢 |  |  |  |  |  |
| [require-issuer-validation](https://eslint.interlace.tools/docs/security/plugin-jwt/rules/require-issuer-validation?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt) | CWE-287 |  |  | The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance: | 🟢 |  |  |  |  |  |
| [require-max-age](https://eslint.interlace.tools/docs/security/plugin-jwt/rules/require-max-age?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt) | CWE-294 |  |  | This rule mandates maxAge in verify operations | 🟢 |  |  |  |  |  |
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
  <a href="https://eslint.interlace.tools/docs/security/plugin-jwt?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-jwt"><img src="https://eslint.interlace.tools/images/og-jwt.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>