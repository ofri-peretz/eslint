# eslint-plugin-crypto

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Cryptographic security rules enforcing best practices and modern standards.
</p>
[![npm version](https://img.shields.io/npm/v/eslint-plugin-crypto.svg)](https://www.npmjs.com/package/eslint-plugin-crypto)
[![npm downloads](https://img.shields.io/npm/dm/eslint-plugin-crypto.svg)](https://www.npmjs.com/package/eslint-plugin-crypto)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![codecov](https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=crypto)](https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=crypto)
[![Dec 2025](https://img.shields.io/badge/Dec_2025-blue?logo=rocket&logoColor=white)](https://github.com/ofri-peretz/eslint)

## Description

> **📘 Full Documentation:** [https://eslint.interlace.tools/docs/crypto](https://eslint.interlace.tools/docs/crypto)
>
> 🔐 Security-focused ESLint plugin for cryptographic best practices. Detects weak algorithms, insecure key handling, CVE vulnerabilities, and guides you to modern, secure alternatives.

> [!TIP]
> For **complete OWASP coverage**, combine with [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) which provides 78 additional rules covering all OWASP categories.

## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

```bash
npm install eslint-plugin-crypto --save-dev
```

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Cryptographic security rules enforcing best practices and modern standards.
</p>
## Description

## Getting Started

```bash
npm install eslint-plugin-crypto --save-dev
```

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Cryptographic security rules enforcing best practices and modern standards.
</p>
## Description

## Getting Started

```bash
npm install eslint-plugin-crypto --save-dev
```

---

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

## Installation

```bash
npm install eslint-plugin-crypto --save-dev
```

## 🚀 Quick Start

### ESLint Flat Config (eslint.config.js)

```javascript
import crypto from 'eslint-plugin-crypto';

export default [crypto.configs.recommended];
```

## Presets

| Preset               | Description                                  |
| -------------------- | -------------------------------------------- |
| `recommended`        | Balanced security defaults for most projects |
| `strict`             | All 24 rules as errors for maximum security  |
| `cryptojs-migration` | For teams migrating from crypto-js           |
| `nodejs-only`        | Only Node.js crypto rules                    |
| `cve-focused`        | Rules targeting specific CVEs                |

## Rules

| Rule                                                                               | Tag                    |   CWE   |  OWASP   | CVSS | Description                                 | 💼  | ⚠️  | 🔧  | 💡  | 🚫  |
| :--------------------------------------------------------------------------------- | :--------------------- | :-----: | :------: | :--: | :------------------------------------------ | :-: | :-: | :-: | :-: | :-: |
| [no-weak-hash-algorithm](docs/rules/no-weak-hash-algorithm.md)                     | Core Node.js Crypto    | CWE-327 | A02:2021 | 7.5  | Disallow MD5, SHA1, MD4                     | 💼  |     |     | 💡  |     |
| [no-weak-cipher-algorithm](docs/rules/no-weak-cipher-algorithm.md)                 | Core Node.js Crypto    | CWE-327 | A02:2021 | 7.5  | Disallow DES, 3DES, RC4                     | 💼  |     |     | 💡  |     |
| [no-deprecated-cipher-method](docs/rules/no-deprecated-cipher-method.md)           | Core Node.js Crypto    | CWE-327 | A02:2021 | 5.0  | Disallow createCipher()                     | 💼  |     |     | 💡  |     |
| [no-static-iv](docs/rules/no-static-iv.md)                                         | Core Node.js Crypto    | CWE-329 | A02:2021 | 7.5  | Disallow hardcoded IVs                      | 💼  |     |     | 💡  |     |
| [no-ecb-mode](docs/rules/no-ecb-mode.md)                                           | Core Node.js Crypto    | CWE-327 | A02:2021 | 7.5  | Disallow ECB encryption                     | 💼  |     |     | 💡  |     |
| [no-insecure-key-derivation](docs/rules/no-insecure-key-derivation.md)             | Core Node.js Crypto    | CWE-916 | A02:2021 | 7.5  | Require PBKDF2 ≥100k iterations             | 💼  |     |     | 💡  |     |
| [no-hardcoded-crypto-key](docs/rules/no-hardcoded-crypto-key.md)                   | Core Node.js Crypto    | CWE-321 | A02:2021 | 9.8  | Disallow hardcoded keys                     | 💼  |     |     | 💡  |     |
| [require-random-iv](docs/rules/require-random-iv.md)                               | Core Node.js Crypto    | CWE-329 | A02:2021 | 7.5  | Require IV from randomBytes()               | 💼  |     |     | 💡  |     |
| [no-insecure-rsa-padding](docs/rules/no-insecure-rsa-padding.md)                   | CVE-Specific Rules     | CWE-327 | A02:2021 | 7.4  | Marvin Attack (CVE-2023-46809)              | 💼  |     |     | 💡  |     |
| [no-cryptojs-weak-random](docs/rules/no-cryptojs-weak-random.md)                   | CVE-Specific Rules     | CWE-338 | A02:2021 | 5.3  | Weak PRNG in crypto-js (CVE-2020-36732)     | 💼  |     |     | 💡  |     |
| [require-secure-pbkdf2-digest](docs/rules/require-secure-pbkdf2-digest.md)         | CVE-Specific Rules     | CWE-916 | A02:2021 | 9.1  | Weak PBKDF2 defaults (CVE-2023-46233)       | 💼  |     |     | 💡  |     |
| [no-math-random-crypto](docs/rules/no-math-random-crypto.md)                       | Advanced Security      | CWE-338 | A07:2021 | 5.3  | Disallow Math.random() for crypto           | 💼  |     |     | 💡  |     |
| [no-predictable-salt](docs/rules/no-predictable-salt.md)                           | Advanced Security      | CWE-331 | A07:2021 | 7.5  | Disallow empty/hardcoded salts              | 💼  |     |     | 💡  |     |
| [require-authenticated-encryption](docs/rules/require-authenticated-encryption.md) | Advanced Security      | CWE-327 | A04:2021 | 6.5  | Require GCM instead of CBC                  | 💼  |     |     | 💡  |     |
| [no-key-reuse](docs/rules/no-key-reuse.md)                                         | Advanced Security      | CWE-323 | A02:2021 | 7.5  | Warn on key reuse                           | 💼  |     |     | 💡  |     |
| [no-self-signed-certs](docs/rules/no-self-signed-certs.md)                         | Advanced Security      | CWE-295 | A05:2021 | 7.5  | Disallow rejectUnauthorized: false          | 💼  |     |     | 💡  |     |
| [no-timing-unsafe-compare](docs/rules/no-timing-unsafe-compare.md)                 | Advanced Security      | CWE-208 | A02:2021 | 5.9  | Require timingSafeEqual()                   | 💼  |     |     | 💡  |     |
| [require-key-length](docs/rules/require-key-length.md)                             | Advanced Security      | CWE-326 | A02:2021 | 7.5  | Require AES-256                             | 💼  |     |     | 💡  |     |
| [no-web-crypto-export](docs/rules/no-web-crypto-export.md)                         | Advanced Security      | CWE-321 | A02:2021 | 5.0  | Warn on key export                          | 💼  |     |     | 💡  |     |
| [no-sha1-hash](docs/rules/no-sha1-hash.md)                                         | Package-Specific Rules | CWE-327 | A02:2021 | 7.5  | Disallow sha1() (crypto-hash)               | 💼  |     |     | 💡  |     |
| [require-sufficient-length](docs/rules/require-sufficient-length.md)               | Package-Specific Rules | CWE-326 | A02:2021 | 7.5  | Require min 32 chars (crypto-random-string) | 💼  |     |     | 💡  |     |
| [no-numeric-only-tokens](docs/rules/no-numeric-only-tokens.md)                     | Package-Specific Rules | CWE-330 | A07:2021 | 5.3  | Warn on numeric-only (crypto-random-string) | 💼  |     |     | 💡  |     |
| [no-cryptojs](docs/rules/no-cryptojs.md)                                           | Package-Specific Rules | CWE-327 | A02:2021 | 5.0  | Warn on deprecated crypto-js                |     |     |     | 💡  |     |
| [no-cryptojs-weak-random](docs/rules/no-cryptojs-weak-random.md)                   | Package-Specific Rules | CWE-338 | A02:2021 | 5.3  | CVE-2020-36732 (crypto-js)                  | 💼  |     |     | 💡  |     |
| [prefer-native-crypto](docs/rules/prefer-native-crypto.md)                         | Package-Specific Rules | CWE-327 | A05:2021 | 5.0  | Prefer native crypto                        |     |     |     | 💡  |     |

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

## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint Ecosystem** — AI-native security plugins with LLM-optimized error messages:

| Plugin                                                                                               | Downloads | Description |
| :--------------------------------------------------------------------------------------------------- | :-------: | :---------- |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding)           |           |             |
| [`eslint-plugin-jwt`](https://www.npmjs.com/package/eslint-plugin-jwt)                               |           |             |
| [`eslint-plugin-pg`](https://www.npmjs.com/package/eslint-plugin-pg)                                 |           |             |
| [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security)     |           |             |
| [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security)       |           |             |
| [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security)       |           |             |
| [`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security)     |           |             |
| [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) |           |             |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next)               |           |             |

## License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<a href="https://eslint.interlace.tools/docs/crypto"><img src="https://eslint.interlace.tools/images/og-crypto-jwt.png" alt="ESLint Interlace Plugin" width="100%" /></a>
