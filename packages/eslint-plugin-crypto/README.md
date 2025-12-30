# eslint-plugin-crypto

> 🔐 Security-focused ESLint plugin for cryptographic best practices. Detects weak algorithms, insecure key handling, CVE vulnerabilities, and guides you to modern, secure alternatives.

[![npm version](https://img.shields.io/npm/v/eslint-plugin-crypto.svg)](https://www.npmjs.com/package/eslint-plugin-crypto)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![codecov](https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=crypto)](https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=crypto)

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

## 🔐 Rules

💼 = Set in `recommended` | 🔧 = Auto-fixable | 💡 = Has suggestions

### Core Node.js Crypto (8 rules)

| Rule                                                                     | CWE     | OWASP    | Description                     | 💼  | 🔧  | 💡  |
| ------------------------------------------------------------------------ | ------- | -------- | ------------------------------- | --- | --- | --- |
| [no-weak-hash-algorithm](docs/rules/no-weak-hash-algorithm.md)           | CWE-327 | A02:2021 | Disallow MD5, SHA1, MD4         | 💼  |     | 💡  |
| [no-weak-cipher-algorithm](docs/rules/no-weak-cipher-algorithm.md)       | CWE-327 | A02:2021 | Disallow DES, 3DES, RC4         | 💼  |     | 💡  |
| [no-deprecated-cipher-method](docs/rules/no-deprecated-cipher-method.md) | CWE-327 | A02:2021 | Disallow createCipher()         | 💼  |     | 💡  |
| [no-static-iv](docs/rules/no-static-iv.md)                               | CWE-329 | A02:2021 | Disallow hardcoded IVs          | 💼  |     | 💡  |
| [no-ecb-mode](docs/rules/no-ecb-mode.md)                                 | CWE-327 | A02:2021 | Disallow ECB encryption         | 💼  |     | 💡  |
| [no-insecure-key-derivation](docs/rules/no-insecure-key-derivation.md)   | CWE-916 | A02:2021 | Require PBKDF2 ≥100k iterations | 💼  |     | 💡  |
| [no-hardcoded-crypto-key](docs/rules/no-hardcoded-crypto-key.md)         | CWE-321 | A02:2021 | Disallow hardcoded keys         | 💼  |     | 💡  |
| [require-random-iv](docs/rules/require-random-iv.md)                     | CWE-329 | A02:2021 | Require IV from randomBytes()   | 💼  |     | 💡  |

### CVE-Specific Rules (3 rules)

| Rule                                                                       | CWE     | OWASP    | Description                             | 💼  | 🔧  | 💡  |
| -------------------------------------------------------------------------- | ------- | -------- | --------------------------------------- | --- | --- | --- |
| [no-insecure-rsa-padding](docs/rules/no-insecure-rsa-padding.md)           | CWE-327 | A02:2021 | Marvin Attack (CVE-2023-46809)          | 💼  |     | 💡  |
| [no-cryptojs-weak-random](docs/rules/no-cryptojs-weak-random.md)           | CWE-338 | A02:2021 | Weak PRNG in crypto-js (CVE-2020-36732) | 💼  |     | 💡  |
| [require-secure-pbkdf2-digest](docs/rules/require-secure-pbkdf2-digest.md) | CWE-916 | A02:2021 | Weak PBKDF2 defaults (CVE-2023-46233)   | 💼  |     | 💡  |

### Advanced Security (7 rules)

| Rule                                                                               | CWE     | OWASP    | Description                        | 💼  | 🔧  | 💡  |
| ---------------------------------------------------------------------------------- | ------- | -------- | ---------------------------------- | --- | --- | --- |
| [no-math-random-crypto](docs/rules/no-math-random-crypto.md)                       | CWE-338 | A07:2021 | Disallow Math.random() for crypto  | 💼  |     | 💡  |
| [no-predictable-salt](docs/rules/no-predictable-salt.md)                           | CWE-331 | A07:2021 | Disallow empty/hardcoded salts     | 💼  |     | 💡  |
| [require-authenticated-encryption](docs/rules/require-authenticated-encryption.md) | CWE-327 | A04:2021 | Require GCM instead of CBC         | 💼  |     | 💡  |
| [no-key-reuse](docs/rules/no-key-reuse.md)                                         | CWE-323 | A02:2021 | Warn on key reuse                  | 💼  |     | 💡  |
| [no-self-signed-certs](docs/rules/no-self-signed-certs.md)                         | CWE-295 | A05:2021 | Disallow rejectUnauthorized: false | 💼  |     | 💡  |
| [no-timing-unsafe-compare](docs/rules/no-timing-unsafe-compare.md)                 | CWE-208 | A02:2021 | Require timingSafeEqual()          | 💼  |     | 💡  |
| [require-key-length](docs/rules/require-key-length.md)                             | CWE-326 | A02:2021 | Require AES-256                    | 💼  |     | 💡  |
| [no-web-crypto-export](docs/rules/no-web-crypto-export.md)                         | CWE-321 | A02:2021 | Warn on key export                 | 💼  |     | 💡  |

### Package-Specific Rules (6 rules)

| Rule                                                                 | CWE     | OWASP    | Description                                 | 💼  | 🔧  | 💡  |
| -------------------------------------------------------------------- | ------- | -------- | ------------------------------------------- | --- | --- | --- |
| [no-sha1-hash](docs/rules/no-sha1-hash.md)                           | CWE-327 | A02:2021 | Disallow sha1() (crypto-hash)               | 💼  |     | 💡  |
| [require-sufficient-length](docs/rules/require-sufficient-length.md) | CWE-326 | A02:2021 | Require min 32 chars (crypto-random-string) | 💼  |     | 💡  |
| [no-numeric-only-tokens](docs/rules/no-numeric-only-tokens.md)       | CWE-330 | A07:2021 | Warn on numeric-only (crypto-random-string) | 💼  |     | 💡  |
| [no-cryptojs](docs/rules/no-cryptojs.md)                             | CWE-327 | A02:2021 | Warn on deprecated crypto-js                |     |     | 💡  |
| [no-cryptojs-weak-random](docs/rules/no-cryptojs-weak-random.md)     | CWE-338 | A02:2021 | CVE-2020-36732 (crypto-js)                  | 💼  |     | 💡  |
| [prefer-native-crypto](docs/rules/prefer-native-crypto.md)           | CWE-327 | A05:2021 | Prefer native crypto                        |     |     | 💡  |

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

| OWASP Category                         | Rules                                                                                                          | Coverage |
| -------------------------------------- | :------------------------------------------------------------------------------------------------------------- | :------: |
| **A02:2021 Cryptographic Failures**    | `no-weak-hash-algorithm`, `no-weak-cipher-algorithm`, `no-static-iv`, `no-ecb-mode`, `no-hardcoded-crypto-key` |    ✅    |
| **A03:2021 Injection**                 | `no-insecure-rsa-padding` (CVE-2023-46809)                                                                     |    ✅    |
| **A04:2021 Insecure Design**           | `require-authenticated-encryption`, `require-key-length`, `no-insecure-key-derivation`                         |    ✅    |
| **A05:2021 Security Misconfiguration** | `no-self-signed-certs`, `prefer-native-crypto`                                                                 |    ✅    |
| **A07:2021 Identification Failures**   | `no-math-random-crypto`, `no-predictable-salt`, `require-random-iv`                                            |    ✅    |

## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint Ecosystem** — AI-native security plugins with LLM-optimized error messages:

| Plugin                                                                                               |                                                                Downloads                                                                 | Description                                              | Rules |
| ---------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------: | -------------------------------------------------------- | :---: |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding)           |      [![npm](https://img.shields.io/npm/dm/eslint-plugin-secure-coding.svg)](https://npmjs.com/package/eslint-plugin-secure-coding)      | Universal security (OWASP Top 10 Web + Mobile)           |  89   |
| [`eslint-plugin-jwt`](https://www.npmjs.com/package/eslint-plugin-jwt)                               |                [![npm](https://img.shields.io/npm/dm/eslint-plugin-jwt.svg)](https://npmjs.com/package/eslint-plugin-jwt)                | JWT security (algorithm confusion, weak secrets, claims) |  13   |
| [`eslint-plugin-pg`](https://www.npmjs.com/package/eslint-plugin-pg)                                 |                 [![npm](https://img.shields.io/npm/dm/eslint-plugin-pg.svg)](https://npmjs.com/package/eslint-plugin-pg)                 | PostgreSQL/node-postgres security                        |  13   |
| [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | [![npm](https://img.shields.io/npm/dm/eslint-plugin-vercel-ai-security.svg)](https://npmjs.com/package/eslint-plugin-vercel-ai-security) | Vercel AI SDK security                                   |  19   |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next)               |        [![npm](https://img.shields.io/npm/dm/eslint-plugin-import-next.svg)](https://npmjs.com/package/eslint-plugin-import-next)        | High-performance import linting                          |  12   |

## License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)
