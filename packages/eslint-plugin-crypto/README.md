<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Cryptographic security rules enforcing best practices and modern standards (Node.js crypto).
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-crypto" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-crypto.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-crypto" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-crypto.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=eslint-plugin-crypto" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=eslint-plugin-crypto" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
</p>

## Description

This plugin provides Cryptographic security rules enforcing best practices and modern standards (Node.js crypto).
By using this plugin, you can proactively identify and mitigate security risks across your entire codebase.

## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/crypto), visit [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/crypto), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- [가이드](https://eslint.interlace.tools/docs/crypto) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/crypto)は [eslint.interlace.tools](https://eslint.interlace.tools)でご確認ください。 📚
- Para ver la [guía](https://eslint.interlace.tools/docs/crypto), visita [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- للاطلاع على [الدليل](https://eslint.interlace.tools/docs/crypto)، قم بزيارة [eslint.interlace.tools](https://eslint.interlace.tools). 📚

```bash
npm install eslint-plugin-crypto --save-dev
```

## ⚙️ Configuration Presets
| Preset               | Description                                  |
| :------------------- | :------------------------------------------- |
| `recommended`        | Balanced security defaults for most projects |
| `strict`             | Strict preset - all rules as errors          |
| `cryptojs-migration` | For teams migrating from crypto-js           |
| `nodejs-only`        | Only Node.js crypto rules                    |
| `cve-focused`        | Rules targeting specific CVEs                |

## 📚 Supported Libraries
| Library            | npm                                                                                                                | Downloads                                                                                                              | Detection                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `crypto` (Node.js) | [![node](https://img.shields.io/badge/node-built--in-green?style=flat-square)](https://nodejs.org/api/crypto.html) | -                                                                                                                      | Weak Algo, Key Length, Randomness |
| `crypto-js`        | [![npm](https://img.shields.io/npm/v/crypto-js.svg?style=flat-square)](https://www.npmjs.com/package/crypto-js)    | [![downloads](https://img.shields.io/npm/dt/crypto-js.svg?style=flat-square)](https://www.npmjs.com/package/crypto-js) | Legacy patterns, Weak PRNG        |

## 💡 What You Get

- **24 security rules** covering cryptographic best practices
- **CVE detection** for CVE-2023-46809, CVE-2020-36732, CVE-2023-46233
- **OWASP Top 10 coverage** for cryptographic vulnerabilities
- **LLM-optimized messages** with CWE references and fix guidance
- **Package support** for crypto-hash, crypto-random-string, crypto-js
- **Auto-Fix suggestions** where safe

## 🔍 Examples

### ❌ Bad

```javascript
// CVE-2023-46809: Marvin Attack
crypto.privateDecrypt({ key, padding: crypto.constants.RSA_PKCS1_PADDING }, buffer);

// CWE-338: Weak random
const token = Math.random().toString(36);

// CWE-327: ECB mode leaks patterns
crypto.createCipheriv('aes-256-ecb', key, iv);

// CWE-208: Timing attack
if (userToken === storedToken) { ... }
```

### ✅ Good

```javascript
// Use OAEP padding
crypto.privateDecrypt({ key, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, buffer);

// Secure random
const token = crypto.randomBytes(32).toString('hex');

// GCM provides authentication
crypto.createCipheriv('aes-256-gcm', key, iv);

// Constant-time comparison
if (crypto.timingSafeEqual(Buffer.from(userToken), Buffer.from(storedToken))) { ... }
```

## Peer Dependencies (Optional)

```json
{
  "crypto-hash": ">=3.0.0",
  "crypto-random-string": ">=4.0.0",
  "crypto-js": ">=4.0.0"
}
```

## Rules

**Legend**

| Icon | Description |
| :---: | :--- |
| 💼 | **Recommended**: Included in the recommended preset. |
| ⚠️ | **Warns**: Set towarn in recommended preset. |
| 🔧 | **Auto-fixable**: Automatically fixable by the `--fix` CLI option. |
| 💡 | **Suggestions**: Providing code suggestions in IDE. |
| 🚫 | **Deprecated**: This rule is deprecated. |
| 🟢 | **Type-unaware**: AST-only, runs in oxlint JS-plugin tier. |
| 🟡 | **Type-aware (refining)**: pure-AST primary path; types refine precision. |
| 🟠 | **Type-aware (graceful)**: requires TS program; silent without it. |

| Rule | CWE | OWASP | CVSS | Description | 🧠 | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| [no-hardcoded-crypto-key](https://eslint.interlace.tools/docs/crypto/rules/no-hardcoded-crypto-key) | CWE-321 | A02:2025 | 9.8 | Enforce no hardcoded crypto key | 🟢 | 💼 |  |  | 💡 |  |
| [no-key-reuse](https://eslint.interlace.tools/docs/crypto/rules/no-key-reuse) | CWE-323 | A02:2025 | 7.5 | Enforce no key reuse | 🟢 | 💼 | ⚠️ |  | 💡 |  |
| [no-math-random-crypto](https://eslint.interlace.tools/docs/crypto/rules/no-math-random-crypto) | CWE-338 | A07:2025 | 5.3 | Enforce no math random crypto | 🟢 | 💼 |  |  | 💡 |  |
| [no-numeric-only-tokens](https://eslint.interlace.tools/docs/crypto/rules/no-numeric-only-tokens) | CWE-330 | A07:2025 | 5.3 | Enforce no numeric only tokens | 🟢 | 💼 | ⚠️ |  | 💡 |  |
| [no-predictable-salt](https://eslint.interlace.tools/docs/crypto/rules/no-predictable-salt) | CWE-331 | A07:2025 | 7.5 | Enforce no predictable salt | 🟢 | 💼 |  |  | 💡 |  |
| [no-web-crypto-export](https://eslint.interlace.tools/docs/crypto/rules/no-web-crypto-export) | CWE-321 | A02:2025 | 5.0 | Enforce no web crypto export | 🟢 | 💼 | ⚠️ |  | 💡 |  |
| [require-authenticated-encryption](https://eslint.interlace.tools/docs/crypto/rules/require-authenticated-encryption) | CWE-327 | A04:2025 | 6.5 | Enforce require authenticated encryption | 🟢 | 💼 | ⚠️ |  | 💡 |  |
| [require-key-length](https://eslint.interlace.tools/docs/crypto/rules/require-key-length) | CWE-326 | A02:2025 | 7.5 | Enforce require key length | 🟢 | 💼 | ⚠️ |  | 💡 |  |
| [require-random-iv](https://eslint.interlace.tools/docs/crypto/rules/require-random-iv) | CWE-329 | A02:2025 | 7.5 | Enforce require random iv | 🟢 | 💼 | ⚠️ |  | 💡 |  |
| [require-secure-pbkdf2-digest](https://eslint.interlace.tools/docs/crypto/rules/require-secure-pbkdf2-digest) | CWE-916 | A02:2025 | 9.1 | Enforce require secure pbkdf2 digest | 🟢 | 💼 |  |  | 💡 |  |
| [require-sufficient-length](https://eslint.interlace.tools/docs/crypto/rules/require-sufficient-length) | CWE-326 | A02:2025 | 7.5 | Enforce require sufficient length | 🟢 | 💼 | ⚠️ |  | 💡 |  |

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

## 📦 Compatibility

| Package | Version |
| :--- | :--- |
| ESLint | `^8.0.0 \|\| ^9.0.0 \|\| ^10.0.0` |
| Node.js | `>=18.0.0` |

See the [ESLint Version Support Policy](../../docs/ESLINT_VERSION_SUPPORT.md) — current ecosystem share data, the 20% gate, and the forward-looking exception that covers v10.

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/crypto"><img src="https://eslint.interlace.tools/images/og-crypto.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>