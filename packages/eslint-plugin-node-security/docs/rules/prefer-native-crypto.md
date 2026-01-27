---
title: prefer-native-crypto
description: Prefer native crypto over third-party libraries
category: security
severity: medium
tags: ['security', 'cryptography', 'cwe-1104', 'nodejs', 'best-practice']
autofix: false
cwe: CWE-1104
owasp: A06:2021-Vulnerable-and-Outdated-Components
---

> **Keywords:** native crypto, third-party, crypto-js, forge, sjcl, CWE-1104, security, ESLint rule
> **CWE:** [CWE-1104](https://cwe.mitre.org/data/definitions/1104.html)  
> **OWASP:** [A06:2021-Vulnerable and Outdated Components](https://owasp.org/Top10/A06_2021-Vulnerable_and_Outdated_Components/)

Suggests using native Node.js crypto or Web Crypto API instead of third-party cryptography libraries. This rule is part of [`eslint-plugin-node-security`](https://www.npmjs.com/package/eslint-plugin-node-security) and provides LLM-optimized error messages.

**⚠️ Security suggestion** | **💡 Provides alternatives** | **📋 Set to warn in `recommended`**

## Quick Summary

| Aspect            | Details                                                                    |
| ----------------- | -------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-1104](https://cwe.mitre.org/data/definitions/1104.html) (Third Party) |
| **Severity**      | Medium (security recommendation)                                           |
| **Auto-Fix**      | 💡 Suggests native alternatives                                            |
| **Category**      | Security                                                                   |
| **ESLint MCP**    | ✅ Optimized for ESLint MCP integration                                    |
| **Best For**      | All Node.js applications using cryptography                                |

## Why Native Crypto?

| Aspect              | Native Crypto                         | Third-Party Libraries        |
| ------------------- | ------------------------------------- | ---------------------------- |
| **Maintenance**     | Maintained by Node.js/browser vendors | Varies, some abandoned       |
| **Performance**     | Uses OpenSSL, hardware acceleration   | Pure JS, slower              |
| **Security Audits** | Regular security reviews              | May not be audited           |
| **CVE Response**    | Patched in Node.js releases           | May have slow or no response |
| **Dependencies**    | Built-in, no extra deps               | Adds to supply chain risk    |

## Rule Details

This rule detects imports of these third-party crypto libraries:

- `crypto-js` / `cryptojs`
- `sjcl` (Stanford JavaScript Crypto Library)
- `forge` / `node-forge`
- `jsencrypt`
- `bcryptjs` (pure JS bcrypt)
- `js-sha256`, `js-sha512`, `js-sha3`, `js-md5`
- `blueimp-md5`
- `aes-js`

## Why This Matters

| Risk                | Impact                            | Solution                          |
| ------------------- | --------------------------------- | --------------------------------- |
| 📦 **Supply Chain** | Each dep adds attack surface      | Use built-in crypto               |
| ⏰ **Unmaintained** | Some libs are abandoned           | Native crypto always maintained   |
| 🐢 **Performance**  | Pure JS is slower than native     | Native uses hardware acceleration |
| 🔒 **Auditing**     | Third-party may have hidden vulns | Native undergoes security reviews |

## Configuration

| Option     | Type                  | Default  | Description                |
| ---------- | --------------------- | -------- | -------------------------- |
| `severity` | `'error'` \| `'warn'` | `'warn'` | Severity level for reports |

```javascript
{
  rules: {
    'node-security/prefer-native-crypto': ['warn', {
      severity: 'warn'
    }]
  }
}
```

## Examples

### ❌ Third-Party (Flagged)

```typescript
// crypto-js (deprecated, unmaintained)
import CryptoJS from 'crypto-js';

// node-forge (useful for some tasks, but prefer native when possible)
import forge from 'node-forge';

// Pure JS implementations (slower, less audited)
import sha256 from 'js-sha256';
import { AES } from 'aes-js';

// Stanford JavaScript Crypto Library
import sjcl from 'sjcl';
```

### ✅ Native (Preferred)

```typescript
// Node.js crypto module (recommended)
import crypto from 'node:crypto';

// Hashing
const hash = crypto.createHash('sha256').update(data).digest('hex');

// HMAC
const hmac = crypto.createHmac('sha256', secret).update(data).digest('hex');

// Symmetric encryption
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

// Asymmetric encryption
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 4096,
});

// Web Crypto API (also in Node.js 15+)
const subtle = globalThis.crypto.subtle;
const hashBuffer = await subtle.digest('SHA-256', data);
```

## Migration Examples

### SHA-256 Hashing

```typescript
// Before (crypto-js)
import CryptoJS from 'crypto-js';
const hash = CryptoJS.SHA256(message).toString();

// After (native)
import crypto from 'node:crypto';
const hash = crypto.createHash('sha256').update(message).digest('hex');
```

### AES Encryption

```typescript
// Before (aes-js)
import aesjs from 'aes-js';
const aes = new aesjs.ModeOfOperation.ctr(key);
const encrypted = aes.encrypt(data);

// After (native)
import crypto from 'node:crypto';
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
```

### RSA Operations

```typescript
// Before (node-forge)
import forge from 'node-forge';
const { publicKey } = forge.pki.rsa.generateKeyPair(2048);

// After (native)
import crypto from 'node:crypto';
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
});
```

## When Third-Party IS Acceptable

Some use cases where third-party libraries may be appropriate:

1. **Browser-Only Code**: Web Crypto API may not cover all needs
2. **Legacy Format Support**: PEM/ASN.1 parsing with node-forge
3. **Specific Algorithms**: Argon2 (node-argon2), bcrypt (bcrypt package)
4. **Cross-Platform**: Identical behavior across Node.js and browsers

```javascript
// Disable for legitimate use cases
/* eslint-disable node-security/prefer-native-crypto */
import forge from 'node-forge'; // For PEM parsing
/* eslint-enable node-security/prefer-native-crypto */
```

## Security Impact

| Vulnerability          | CWE  | OWASP    | CVSS       | Impact                    |
| ---------------------- | ---- | -------- | ---------- | ------------------------- |
| Third-Party Component  | 1104 | A06:2021 | 3.1 Low    | Supply chain risk         |
| Unmaintained Component | 1104 | A06:2021 | 5.3 Medium | Unpatched vulnerabilities |

## Related Rules

- [`no-cryptojs`](./no-cryptojs.md) - Specific detection for crypto-js
- [`no-cryptojs-weak-random`](./no-cryptojs-weak-random.md) - CVE-2020-36732 detection

## Further Reading

- **[Node.js Crypto Documentation](https://nodejs.org/api/crypto.html)** - Native crypto module
- **[Web Crypto API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)** - Browser crypto
- **[CWE-1104: Unmaintained Third Party Components](https://cwe.mitre.org/data/definitions/1104.html)** - Official CWE entry
