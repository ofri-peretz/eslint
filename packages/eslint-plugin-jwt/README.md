# eslint-plugin-jwt

> 🔐 Security-focused ESLint plugin for JWT authentication. Detects algorithm confusion (CVE-2022-23540), replay attacks, weak secrets, and library-specific vulnerabilities with AI-optimized fix guidance.

[![npm version](https://img.shields.io/npm/v/eslint-plugin-jwt.svg)](https://www.npmjs.com/package/eslint-plugin-jwt)
[![npm downloads](https://img.shields.io/npm/dm/eslint-plugin-jwt.svg)](https://www.npmjs.com/package/eslint-plugin-jwt)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![codecov](https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=jwt)](https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=jwt)
[![Dec 2025](https://img.shields.io/badge/Dec_2025-blue?logo=rocket&logoColor=white)](https://github.com/ofri-peretz/eslint)

## 💡 What You Get

- **13 Security Rules** - Algorithm attacks, replay prevention, claim validation
- **6 JWT Libraries** - jsonwebtoken, jose, express-jwt, @nestjs/jwt, jwks-rsa, jwt-decode
- **2025 Research** - "Back to the Future" replay attack prevention (LightSEC 2025)
- **AI-Optimized** - Structured messages for GitHub Copilot, Cursor, Claude assistance
- **CWE References** - Every rule maps to Common Weakness Enumeration

## 📦 Installation

```bash
npm install --save-dev eslint-plugin-jwt
# or
pnpm add -D eslint-plugin-jwt
```

## 🚀 Quick Start

### Flat Config (ESLint 9+)

```javascript
// eslint.config.js
import jwt from 'eslint-plugin-jwt';

export default [
  jwt.configs.recommended,
  // or jwt.configs.strict for maximum security
];
```

### Custom Configuration

```javascript
import jwt from 'eslint-plugin-jwt';

export default [
  {
    plugins: { jwt },
    rules: {
      // Critical - Algorithm attacks
      'jwt/no-algorithm-none': 'error',
      'jwt/no-algorithm-confusion': 'error',

      // High - Verification and secrets
      'jwt/require-algorithm-whitelist': 'warn',
      'jwt/no-decode-without-verify': 'warn',
      'jwt/no-weak-secret': 'error',
      'jwt/no-hardcoded-secret': 'error',

      // Medium - Best practices
      'jwt/require-expiration': 'warn',
      'jwt/require-issuer-validation': 'warn',
      'jwt/require-audience-validation': 'warn',
    },
  },
];
```

## 🔐 Rules

💼 = Set in `recommended` | 🔧 = Auto-fixable | 💡 = Has suggestions

### Critical Severity (Algorithm Attacks)

| Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| [no-algorithm-none](docs/rules/no-algorithm-none.md) | CWE-347 | A02:2021 |  | Prevent `alg:"none"` attack (CVE-2022-23540) | 💼 |  |  | 💡 |  |
| [no-algorithm-confusion](docs/rules/no-algorithm-confusion.md) | CWE-347 | A02:2021 |  | Prevent RS256→HS256 key confusion | 💼 |  |  | 💡 |  |
### High Severity (Verification & Secrets)

| Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| [require-algorithm-whitelist](docs/rules/require-algorithm-whitelist.md) | CWE-757 | A02:2021 |  | Require explicit algorithm specification | 💼 |  |  | 💡 |  |
| [no-decode-without-verify](docs/rules/no-decode-without-verify.md) | CWE-345 | A04:2021 |  | Prevent trusting decoded payloads | 💼 |  |  | 💡 |  |
| [no-weak-secret](docs/rules/no-weak-secret.md) | CWE-326 | A02:2021 |  | Require 256-bit minimum secrets | 💼 |  |  | 💡 |  |
| [no-hardcoded-secret](docs/rules/no-hardcoded-secret.md) | CWE-798 | A05:2021 |  | Prevent secrets in source code | 💼 |  |  | 💡 |  |
| [no-timestamp-manipulation](docs/rules/no-timestamp-manipulation.md) | CWE-294 | A05:2021 |  | Prevent disabling automatic `iat` | 💼 |  |  | 💡 |  |
### Medium Severity (Claims & Best Practices)

| Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| [require-expiration](docs/rules/require-expiration.md) | CWE-613 | A04:2021 |  | Require `exp` claim or `expiresIn` | 💼 |  |  | 💡 |  |
| [require-issued-at](docs/rules/require-issued-at.md) | CWE-294 | A04:2021 |  | Require `iat` claim for freshness | 💼 |  |  | 💡 |  |
| [require-issuer-validation](docs/rules/require-issuer-validation.md) | CWE-287 | A01:2021 |  | Require issuer validation | 💼 |  |  | 💡 |  |
| [require-audience-validation](docs/rules/require-audience-validation.md) | CWE-287 | A01:2021 |  | Require audience validation | 💼 |  |  | 💡 |  |
| [require-max-age](docs/rules/require-max-age.md) | CWE-294 | A04:2021 |  | Require maxAge for replay prevention | 💼 |  |  | 💡 |  |
| [no-sensitive-payload](docs/rules/no-sensitive-payload.md) | CWE-359 | A01:2021 |  | Prevent PII in token payload | 💼 |  |  | 💡 |  |
## 🔐 OWASP Top 10 2021 Coverage

| OWASP Category                         |                                             Rules                                              | Coverage |
| -------------------------------------- | :--------------------------------------------------------------------------------------------: | :------: |
| **A01:2021 Broken Access Control**     |                   `require-audience-validation`, `require-issuer-validation`                   |    ✅    |
| **A02:2021 Cryptographic Failures**    | `no-algorithm-none`, `no-algorithm-confusion`, `no-weak-secret`, `require-algorithm-whitelist` |    ✅    |
| **A04:2021 Insecure Design**           |              `no-decode-without-verify`, `require-expiration`, `require-max-age`               |    ✅    |
| **A05:2021 Security Misconfiguration** |                       `no-hardcoded-secret`, `no-timestamp-manipulation`                       |    ✅    |
| **A07:2021 Identification Failures**   |                   `require-issuer-validation`, `require-audience-validation`                   |    ✅    |
| **A08:2021 Software/Data Integrity**   |           `no-algorithm-none`, `no-algorithm-confusion`, `no-decode-without-verify`            |    ✅    |

### CWE Coverage Summary

| CWE     | Description                                    | Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| CWE-287 |  |  |  |  |  |  |  |  |  |
| CWE-294 |  |  |  |  |  |  |  |  |  |
| CWE-326 |  |  |  |  |  |  |  |  |  |
| CWE-345 |  |  |  |  |  |  |  |  |  |
| CWE-347 |  |  |  |  |  |  |  |  |  |
| CWE-359 |  |  |  |  |  |  |  |  |  |
| CWE-613 |  |  |  |  |  |  |  |  |  |
| CWE-757 |  |  |  |  |  |  |  |  |  |
| CWE-798 |  |  |  |  |  |  |  |  |  |
## 🛡️ Security Research Coverage

### CVE-2022-23540 (jsonwebtoken Algorithm None)

The `no-algorithm-none` rule detects attempts to use `alg:"none"` which bypasses signature verification entirely.

```javascript
// ❌ Vulnerable - Accepts unsigned tokens
jwt.verify(token, secret, { algorithms: ['none'] });

// ✅ Safe - Explicit secure algorithm
jwt.verify(token, secret, { algorithms: ['RS256'] });
```

### LightSEC 2025 "Back to the Future" Attack

The `no-timestamp-manipulation` and `require-max-age` rules prevent replay attacks where tokens are captured and replayed years later.

```javascript
// ❌ Vulnerable - Disables timestamp, enables replay
jwt.sign(payload, secret, { noTimestamp: true });

// ✅ Safe - Automatic iat, maxAge validation
jwt.sign(payload, secret, { expiresIn: '1h' });
jwt.verify(token, secret, { maxAge: '1h' });
```

### Algorithm Confusion Attack

The `no-algorithm-confusion` rule detects when symmetric algorithms (HS256) are used with asymmetric keys (public keys).

```javascript
// ❌ Vulnerable - Public key as HMAC secret
jwt.verify(token, publicKey, { algorithms: ['HS256'] });

// ✅ Safe - Asymmetric algorithm with public key
jwt.verify(token, publicKey, { algorithms: ['RS256'] });
```

## ⚙️ Configuration Presets

| Preset        | Description                      | Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| `recommended` |  |  |  |  |  |  |  |  |  |
| `strict` |  |  |  |  |  |  |  |  |  |
| `legacy` |  |  |  |  |  |  |  |  |  |
## 📚 Supported Libraries

| Library      | npm                                                | Detection |
| ------------ | -------------------------------------------------- | --------- |
| jsonwebtoken | ![npm](https://img.shields.io/npm/dw/jsonwebtoken) | ✅ Full   |
| jose         | ![npm](https://img.shields.io/npm/dw/jose)         | ✅ Full   |
| express-jwt  | ![npm](https://img.shields.io/npm/dw/express-jwt)  | ✅ Full   |
| @nestjs/jwt  | ![npm](https://img.shields.io/npm/dw/@nestjs/jwt)  | ✅ Full   |
| jwks-rsa     | ![npm](https://img.shields.io/npm/dw/jwks-rsa)     | ✅ Full   |
| jwt-decode   | ![npm](https://img.shields.io/npm/dw/jwt-decode)   | ✅ Full   |

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

## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint Ecosystem** — AI-native security plugins with LLM-optimized error messages:

| Plugin                                                                                               |                                                                Downloads                                                                 | Description                                                  | Rule | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) |  |  |  |  |  |  |  |  |  |
| [`eslint-plugin-crypto`](https://www.npmjs.com/package/eslint-plugin-crypto) |  |  |  |  |  |  |  |  |  |
| [`eslint-plugin-pg`](https://www.npmjs.com/package/eslint-plugin-pg) |  |  |  |  |  |  |  |  |  |
| [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security) |  |  |  |  |  |  |  |  |  |
| [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security) |  |  |  |  |  |  |  |  |  |
| [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security) |  |  |  |  |  |  |  |  |  |
| [`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security) |  |  |  |  |  |  |  |  |  |
| [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) |  |  |  |  |  |  |  |  |  |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next) |  |  |  |  |  |  |  |  |  |
## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)
