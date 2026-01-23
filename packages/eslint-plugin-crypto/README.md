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
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
</p>

## Description

This plugin enforces cryptographic best practices and modern security standards specifically for Node.js environments. It assists developers in avoiding weak algorithms and insecure implementations by flagging potential risks directly in the code. By integrating these checks, you can ensure that your application's data protection measures are robust and compliant with industry standards.

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

This plugin is optimized for ESLint's [Model Context Protocol (MCP)](https://eslint.org/docs/latest/use/mcp), enabling AI assistants like **Cursor**, **GitHub Copilot**, and **Claude** to:

- Understand the exact vulnerability type via CWE references
- Apply the correct fix using structured guidance
- Provide educational context to developers

```json
// .cursor/mcp.json
{
  "mcpServers": {
    "eslint": {
      "command": "npx",
      "args": ["@eslint/mcp@latest"]
    }
  }
}
```

By providing this structured context (CWE, OWASP, Fix), we enable AI tools to **reason** about the security flaw rather than hallucinating. This allows Copilot/Cursor to suggest the _exact_ correct fix immediately.

## Rules

**Legend**

| Icon | Description                                                        |
| :--: | :----------------------------------------------------------------- |
|  💼  | **Recommended**: Included in the recommended preset.               |
|  ⚠️  | **Warns**: Set towarn in recommended preset.                       |
|  🔧  | **Auto-fixable**: Automatically fixable by the `--fix` CLI option. |
|  💡  | **Suggestions**: Providing code suggestions in IDE.                |
|  🚫  | **Deprecated**: This rule is deprecated.                           |

| Rule                                                                                                                  |   CWE   |  OWASP   | CVSS | Description                                                                        | 💼  | ⚠️  | 🔧  | 💡  | 🚫  |
| :-------------------------------------------------------------------------------------------------------------------- | :-----: | :------: | :--: | :--------------------------------------------------------------------------------- | :-: | :-: | :-: | :-: | :-: |
| [no-weak-hash-algorithm](https://eslint.interlace.tools/docs/crypto/rules/no-weak-hash-algorithm)                     | CWE-327 | A02:2025 | 7.5  | [no-weak-hash-algorithm](docs/rules/no-weak-hash-algorithm.md)                     | 💼  |     |     | 💡  |     |
| [no-weak-cipher-algorithm](https://eslint.interlace.tools/docs/crypto/rules/no-weak-cipher-algorithm)                 | CWE-327 | A02:2025 | 7.5  | [no-weak-cipher-algorithm](docs/rules/no-weak-cipher-algorithm.md)                 | 💼  |     |     | 💡  |     |
| [no-deprecated-cipher-method](https://eslint.interlace.tools/docs/crypto/rules/no-deprecated-cipher-method)           | CWE-327 | A02:2025 | 5.0  | [no-deprecated-cipher-method](docs/rules/no-deprecated-cipher-method.md)           | 💼  |     |     | 💡  |     |
| [no-static-iv](https://eslint.interlace.tools/docs/crypto/rules/no-static-iv)                                         | CWE-329 | A02:2025 | 7.5  | [no-static-iv](docs/rules/no-static-iv.md)                                         | 💼  |     |     | 💡  |     |
| [no-ecb-mode](https://eslint.interlace.tools/docs/crypto/rules/no-ecb-mode)                                           | CWE-327 | A02:2025 | 7.5  | [no-ecb-mode](docs/rules/no-ecb-mode.md)                                           | 💼  |     |     | 💡  |     |
| [no-insecure-key-derivation](https://eslint.interlace.tools/docs/crypto/rules/no-insecure-key-derivation)             | CWE-916 | A02:2025 | 7.5  | [no-insecure-key-derivation](docs/rules/no-insecure-key-derivation.md)             | 💼  |     |     | 💡  |     |
| [no-hardcoded-crypto-key](https://eslint.interlace.tools/docs/crypto/rules/no-hardcoded-crypto-key)                   | CWE-321 | A02:2025 | 9.8  | [no-hardcoded-crypto-key](docs/rules/no-hardcoded-crypto-key.md)                   | 💼  |     |     | 💡  |     |
| [require-random-iv](https://eslint.interlace.tools/docs/crypto/rules/require-random-iv)                               | CWE-329 | A02:2025 | 7.5  | [require-random-iv](docs/rules/require-random-iv.md)                               | 💼  | ⚠️  |     | 💡  |     |
| [no-insecure-rsa-padding](https://eslint.interlace.tools/docs/crypto/rules/no-insecure-rsa-padding)                   | CWE-327 | A02:2025 | 7.4  | [no-insecure-rsa-padding](docs/rules/no-insecure-rsa-padding.md)                   | 💼  |     |     | 💡  |     |
| [no-cryptojs-weak-random](https://eslint.interlace.tools/docs/crypto/rules/no-cryptojs-weak-random)                   | CWE-338 | A02:2025 | 5.3  | [no-cryptojs-weak-random](docs/rules/no-cryptojs-weak-random.md)                   | 💼  |     |     | 💡  |     |
| [require-secure-pbkdf2-digest](https://eslint.interlace.tools/docs/crypto/rules/require-secure-pbkdf2-digest)         | CWE-916 | A02:2025 | 9.1  | [require-secure-pbkdf2-digest](docs/rules/require-secure-pbkdf2-digest.md)         | 💼  |     |     | 💡  |     |
| [no-math-random-crypto](https://eslint.interlace.tools/docs/crypto/rules/no-math-random-crypto)                       | CWE-338 | A07:2025 | 5.3  | [no-math-random-crypto](docs/rules/no-math-random-crypto.md)                       | 💼  |     |     | 💡  |     |
| [no-predictable-salt](https://eslint.interlace.tools/docs/crypto/rules/no-predictable-salt)                           | CWE-331 | A07:2025 | 7.5  | [no-predictable-salt](docs/rules/no-predictable-salt.md)                           | 💼  |     |     | 💡  |     |
| [require-authenticated-encryption](https://eslint.interlace.tools/docs/crypto/rules/require-authenticated-encryption) | CWE-327 | A04:2025 | 6.5  | [require-authenticated-encryption](docs/rules/require-authenticated-encryption.md) | 💼  | ⚠️  |     | 💡  |     |
| [no-key-reuse](https://eslint.interlace.tools/docs/crypto/rules/no-key-reuse)                                         | CWE-323 | A02:2025 | 7.5  | [no-key-reuse](docs/rules/no-key-reuse.md)                                         | 💼  | ⚠️  |     | 💡  |     |
| [no-self-signed-certs](https://eslint.interlace.tools/docs/crypto/rules/no-self-signed-certs)                         | CWE-295 | A05:2025 | 7.5  | [no-self-signed-certs](docs/rules/no-self-signed-certs.md)                         | 💼  |     |     | 💡  |     |
| [no-timing-unsafe-compare](https://eslint.interlace.tools/docs/crypto/rules/no-timing-unsafe-compare)                 | CWE-208 | A02:2025 | 5.9  | [no-timing-unsafe-compare](docs/rules/no-timing-unsafe-compare.md)                 | 💼  | ⚠️  |     | 💡  |     |
| [require-key-length](https://eslint.interlace.tools/docs/crypto/rules/require-key-length)                             | CWE-326 | A02:2025 | 7.5  | [require-key-length](docs/rules/require-key-length.md)                             | 💼  | ⚠️  |     | 💡  |     |
| [no-web-crypto-export](https://eslint.interlace.tools/docs/crypto/rules/no-web-crypto-export)                         | CWE-321 | A02:2025 | 5.0  | [no-web-crypto-export](docs/rules/no-web-crypto-export.md)                         | 💼  | ⚠️  |     | 💡  |     |
| [no-sha1-hash](https://eslint.interlace.tools/docs/crypto/rules/no-sha1-hash)                                         | CWE-327 | A02:2025 | 7.5  | [no-sha1-hash](docs/rules/no-sha1-hash.md)                                         | 💼  |     |     | 💡  |     |
| [require-sufficient-length](https://eslint.interlace.tools/docs/crypto/rules/require-sufficient-length)               | CWE-326 | A02:2025 | 7.5  | [require-sufficient-length](docs/rules/require-sufficient-length.md)               | 💼  | ⚠️  |     | 💡  |     |
| [no-numeric-only-tokens](https://eslint.interlace.tools/docs/crypto/rules/no-numeric-only-tokens)                     | CWE-330 | A07:2025 | 5.3  | [no-numeric-only-tokens](docs/rules/no-numeric-only-tokens.md)                     | 💼  | ⚠️  |     | 💡  |     |
| [no-cryptojs](https://eslint.interlace.tools/docs/crypto/rules/no-cryptojs)                                           | CWE-327 | A02:2025 | 5.0  | [no-cryptojs](docs/rules/no-cryptojs.md)                                           | 💼  | ⚠️  |     | 💡  |     |
| [prefer-native-crypto](https://eslint.interlace.tools/docs/crypto/rules/prefer-native-crypto)                         | CWE-327 | A05:2025 | 5.0  | [prefer-native-crypto](docs/rules/prefer-native-crypto.md)                         | 💼  | ⚠️  |     | 💡  |     |

## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint Ecosystem** — AI-native security plugins with LLM-optimized error messages:

| Plugin                                                                                               |                                                                              Downloads                                                                               | Description                                 |
| :--------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :------------------------------------------ |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding)           |      [![downloads](https://img.shields.io/npm/dt/eslint-plugin-secure-coding.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-secure-coding)      | General security rules & OWASP guidelines.  |
| [`eslint-plugin-pg`](https://www.npmjs.com/package/eslint-plugin-pg)                                 |                 [![downloads](https://img.shields.io/npm/dt/eslint-plugin-pg.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-pg)                 | PostgreSQL security & best practices.       |
| [`eslint-plugin-crypto`](https://www.npmjs.com/package/eslint-plugin-crypto)                         |             [![downloads](https://img.shields.io/npm/dt/eslint-plugin-crypto.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-crypto)             | NodeJS Cryptography security rules.         |
| [`eslint-plugin-jwt`](https://www.npmjs.com/package/eslint-plugin-jwt)                               |                [![downloads](https://img.shields.io/npm/dt/eslint-plugin-jwt.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-jwt)                | JWT security & best practices.              |
| [`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security)     |   [![downloads](https://img.shields.io/npm/dt/eslint-plugin-browser-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-browser-security)   | Browser-specific security & XSS prevention. |
| [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security)     |   [![downloads](https://img.shields.io/npm/dt/eslint-plugin-express-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-express-security)   | Express.js security hardening rules.        |
| [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security)       |    [![downloads](https://img.shields.io/npm/dt/eslint-plugin-lambda-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-lambda-security)    | AWS Lambda security best practices.         |
| [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security)       |    [![downloads](https://img.shields.io/npm/dt/eslint-plugin-nestjs-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-nestjs-security)    | NestJS security rules & patterns.           |
| [`eslint-plugin-mongodb-security`](https://www.npmjs.com/package/eslint-plugin-mongodb-security)     |    [![downloads](https://img.shields.io/npm/dt/eslint-plugin-mongodb-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-mongodb-security)    | MongoDB security best practices.           |
| [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-vercel-ai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | Vercel AI SDK security hardening.           |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next)               |        [![downloads](https://img.shields.io/npm/dt/eslint-plugin-import-next.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import-next)        | Next-gen import sorting & architecture.     |

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/crypto"><img src="https://eslint.interlace.tools/images/og-crypto.png" alt="ESLint Interlace Plugin" width="300" /></a>
</p>
