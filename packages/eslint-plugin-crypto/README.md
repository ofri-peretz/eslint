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

## Rule Categories

### Core Node.js Crypto (8 rules)

| Rule                          | Description                     | CWE     |
| ----------------------------- | ------------------------------- | ------- |
| `no-weak-hash-algorithm`      | Disallow MD5, SHA1, MD4         | CWE-327 |
| `no-weak-cipher-algorithm`    | Disallow DES, 3DES, RC4         | CWE-327 |
| `no-deprecated-cipher-method` | Disallow createCipher()         | CWE-327 |
| `no-static-iv`                | Disallow hardcoded IVs          | CWE-329 |
| `no-ecb-mode`                 | Disallow ECB encryption         | CWE-327 |
| `no-insecure-key-derivation`  | Require PBKDF2 ≥100k iterations | CWE-916 |
| `no-hardcoded-crypto-key`     | Disallow hardcoded keys         | CWE-321 |
| `require-random-iv`           | Require IV from randomBytes()   | CWE-329 |

### CVE-Specific Rules (3 rules)

| Rule                           | CVE            | Description                     |
| ------------------------------ | -------------- | ------------------------------- |
| `no-insecure-rsa-padding`      | CVE-2023-46809 | Marvin Attack (RSA PKCS#1 v1.5) |
| `no-cryptojs-weak-random`      | CVE-2020-36732 | Weak PRNG in crypto-js < 3.2.1  |
| `require-secure-pbkdf2-digest` | CVE-2023-46233 | Weak PBKDF2 defaults (SHA1)     |

### Advanced Security (7 rules)

| Rule                               | Description                        | CWE     |
| ---------------------------------- | ---------------------------------- | ------- |
| `no-math-random-crypto`            | Disallow Math.random() for crypto  | CWE-338 |
| `no-predictable-salt`              | Disallow empty/hardcoded salts     | CWE-331 |
| `require-authenticated-encryption` | Require GCM instead of CBC         | CWE-327 |
| `no-key-reuse`                     | Warn on key reuse                  | CWE-323 |
| `no-self-signed-certs`             | Disallow rejectUnauthorized: false | CWE-295 |
| `no-timing-unsafe-compare`         | Require timingSafeEqual()          | CWE-208 |
| `require-key-length`               | Require AES-256                    | CWE-326 |
| `no-web-crypto-export`             | Warn on key export                 | CWE-321 |

### Package-Specific Rules (6 rules)

| Package              | Rule                        | Description            |
| -------------------- | --------------------------- | ---------------------- |
| crypto-hash          | `no-sha1-hash`              | Disallow sha1()        |
| crypto-random-string | `require-sufficient-length` | Require min 32 chars   |
| crypto-random-string | `no-numeric-only-tokens`    | Warn on numeric-only   |
| crypto-js            | `no-cryptojs`               | Warn on deprecated lib |
| crypto-js            | `no-cryptojs-weak-random`   | CVE-2020-36732         |
| Various              | `prefer-native-crypto`      | Prefer native crypto   |

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

Part of the **Forge-JS ESLint Ecosystem** — AI-native security plugins with LLM-optimized error messages:

| Plugin                                                                                               | Description                                              | Rules |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | :---: |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding)           | Universal security (OWASP Top 10 Web + Mobile)           |  89   |
| [`eslint-plugin-jwt`](https://www.npmjs.com/package/eslint-plugin-jwt)                               | JWT security (algorithm confusion, weak secrets, claims) |  13   |
| [`eslint-plugin-pg`](https://www.npmjs.com/package/eslint-plugin-pg)                                 | PostgreSQL/node-postgres security                        |  13   |
| [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | Vercel AI SDK security                                   |  19   |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next)               | High-performance import linting                          |  12   |

## License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)
