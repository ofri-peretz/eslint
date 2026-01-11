# eslint-plugin-crypto

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
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=crypto" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=crypto" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Dec_2025-blue?logo=rocket&logoColor=white" alt="Dec 2025" /></a>
</p>

## Description

Cryptographic security rules enforcing best practices and modern standards (Node.js crypto).

## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/crypto), visit [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/crypto), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- [가이드](https://eslint.interlace.tools/docs/crypto) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/crypto)は [eslint.interlace.tools](https://eslint.interlace.tools)でご確認ください。 📚

```bash
npm install eslint-plugin-crypto --save-dev
```

## 💡 What You Get
- **24 security rules** covering cryptographic best practices
- **CVE detection** for CVE-2023-46809, CVE-2020-36732, CVE-2023-46233
- **OWASP Top 10 coverage** for cryptographic vulnerabilities
- **LLM-optimized messages** with CWE references and fix guidance
- **Package support** for crypto-hash, crypto-random-string, crypto-js

## Features
- 🔐 **24 Rules** covering crypto best practices
- 🎯 **CVE Detection** (CVE-2023-46809, CVE-2020-36732, CVE-2023-46233)
- 🤖 **AI-Optimized** messages with CWE references
- ⚡ **Auto-Fix** suggestions where safe
- 📦 **Package Support** for crypto-hash, crypto-random-string, crypto-js

## Presets
| Preset               | Description                                  |
| -------------------- | -------------------------------------------- |
| `recommended`        | Balanced security defaults for most projects |
| `strict`             | All 24 rules as errors for maximum security  |
| `cryptojs-migration` | For teams migrating from crypto-js           |
| `nodejs-only`        | Only Node.js crypto rules                    |
| `cve-focused`        | Rules targeting specific CVEs                |

## Examples
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

## AI-Optimized Messages
All rules include LLM-optimized error messages with:

- CWE references for vulnerability classification
- CVE references for known vulnerabilities
- Severity levels (CRITICAL, HIGH, MEDIUM, LOW)
- Direct fix suggestions with code examples
- Documentation links

## 🗂️ OWASP Top 10 2021 Coverage
| OWASP Category                         | Rule | CWE | OWASP | CVSS | Description | 💼  | ⚠️  | 🔧  | 💡  | 🚫  |
| :------------------------------------- | :--: | :-: | :---: | :--- | :---------: | :-: | :-: | :-: | :-: | --- |
| **A02:2021 Cryptographic Failures**    |      |     |       |      |             |     |     |     |     |
| **A03:2021 Injection**                 |      |     |       |      |             |     |     |     |     |
| **A04:2021 Insecure Design**           |      |     |       |      |             |     |     |     |     |
| **A05:2021 Security Misconfiguration** |      |     |       |      |             |     |     |     |     |
| **A07:2021 Identification Failures**   |      |     |       |      |             |     |     |     |     |

## License
MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<a href="https://eslint.interlace.tools/docs/crypto"><img src="https://eslint.interlace.tools/images/og-crypto-jwt.png" alt="ESLint Interlace Plugin" width="100%" /></a>

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
| [no-weak-hash-algorithm](docs/rules/no-weak-hash-algorithm.md) | CWE-327 | A02:2025 | 7.5 | Disallow MD5, SHA1, MD4 | 💼 |  |  | 💡 |  |
| [no-weak-cipher-algorithm](docs/rules/no-weak-cipher-algorithm.md) | CWE-327 | A02:2025 | 7.5 | Disallow DES, 3DES, RC4 | 💼 |  |  | 💡 |  |
| [no-deprecated-cipher-method](docs/rules/no-deprecated-cipher-method.md) | CWE-327 | A02:2025 | 5.0 | Disallow createCipher() | 💼 |  |  | 💡 |  |
| [no-static-iv](docs/rules/no-static-iv.md) | CWE-329 | A02:2025 | 7.5 | Disallow hardcoded IVs | 💼 |  |  | 💡 |  |
| [no-ecb-mode](docs/rules/no-ecb-mode.md) | CWE-327 | A02:2025 | 7.5 | Disallow ECB encryption | 💼 |  |  | 💡 |  |
| [no-insecure-key-derivation](docs/rules/no-insecure-key-derivation.md) | CWE-916 | A02:2025 | 7.5 | Require PBKDF2 ≥100k iterations | 💼 |  |  | 💡 |  |
| [no-hardcoded-crypto-key](docs/rules/no-hardcoded-crypto-key.md) | CWE-321 | A02:2025 | 9.8 | Disallow hardcoded keys | 💼 |  |  | 💡 |  |
| [require-random-iv](docs/rules/require-random-iv.md) | CWE-329 | A02:2025 | 7.5 | Require IV from randomBytes() | 💼 |  |  | 💡 |  |
| [no-insecure-rsa-padding](docs/rules/no-insecure-rsa-padding.md) | CWE-327 | A02:2025 | 7.4 | Marvin Attack (CVE-2023-46809) | 💼 |  |  | 💡 |  |
| [no-cryptojs-weak-random](docs/rules/no-cryptojs-weak-random.md) | CWE-338 | A02:2025 | 5.3 | Weak PRNG in crypto-js (CVE-2020-36732) | 💼 |  |  | 💡 |  |
| [require-secure-pbkdf2-digest](docs/rules/require-secure-pbkdf2-digest.md) | CWE-916 | A02:2025 | 9.1 | Weak PBKDF2 defaults (CVE-2023-46233) | 💼 |  |  | 💡 |  |
| [no-math-random-crypto](docs/rules/no-math-random-crypto.md) | CWE-338 | A07:2025 | 5.3 | Disallow Math.random() for crypto | 💼 |  |  | 💡 |  |
| [no-predictable-salt](docs/rules/no-predictable-salt.md) | CWE-331 | A07:2025 | 7.5 | Disallow empty/hardcoded salts | 💼 |  |  | 💡 |  |
| [require-authenticated-encryption](docs/rules/require-authenticated-encryption.md) | CWE-327 | A04:2025 | 6.5 | Require GCM instead of CBC | 💼 |  |  | 💡 |  |
| [no-key-reuse](docs/rules/no-key-reuse.md) | CWE-323 | A02:2025 | 7.5 | Warn on key reuse | 💼 |  |  | 💡 |  |
| [no-self-signed-certs](docs/rules/no-self-signed-certs.md) | CWE-295 | A05:2025 | 7.5 | Disallow rejectUnauthorized: false | 💼 |  |  | 💡 |  |
| [no-timing-unsafe-compare](docs/rules/no-timing-unsafe-compare.md) | CWE-208 | A02:2025 | 5.9 | Require timingSafeEqual() | 💼 |  |  | 💡 |  |
| [require-key-length](docs/rules/require-key-length.md) | CWE-326 | A02:2025 | 7.5 | Require AES-256 | 💼 |  |  | 💡 |  |
| [no-web-crypto-export](docs/rules/no-web-crypto-export.md) | CWE-321 | A02:2025 | 5.0 | Warn on key export | 💼 |  |  | 💡 |  |
| [no-sha1-hash](docs/rules/no-sha1-hash.md) | CWE-327 | A02:2025 | 7.5 | Disallow sha1() (crypto-hash) | 💼 |  |  | 💡 |  |
| [require-sufficient-length](docs/rules/require-sufficient-length.md) | CWE-326 | A02:2025 | 7.5 | Require min 32 chars (crypto-random-string) | 💼 |  |  | 💡 |  |
| [no-numeric-only-tokens](docs/rules/no-numeric-only-tokens.md) | CWE-330 | A07:2025 | 5.3 | Warn on numeric-only (crypto-random-string) | 💼 |  |  | 💡 |  |
| [no-cryptojs](docs/rules/no-cryptojs.md) | CWE-327 | A02:2025 | 5.0 | Warn on deprecated crypto-js |  |  |  | 💡 |  |
| [prefer-native-crypto](docs/rules/prefer-native-crypto.md) | CWE-327 | A05:2025 | 5.0 | Prefer native crypto |  |  |  | 💡 |  |
| [Plugin](https://eslint.interlace.tools/docs/crypto/rules/Plugin) |  |  |  | Description |  |  |  |  |  |

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
  <a href="https://eslint.interlace.tools/docs/crypto"><img src="https://eslint.interlace.tools/images/og-crypto.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>