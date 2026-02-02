---
title: no-cryptojs
description: Disallow deprecated crypto-js library (use native crypto instead)
tags: ['security', 'cryptography', 'cwe-1104', 'nodejs', 'deprecated']
category: security
severity: medium
cwe: CWE-1104
owasp: "A06:2021"
autofix: false
---

> **Keywords:** crypto-js, deprecated, unmaintained, native crypto, CWE-1104, security, ESLint rule
> **CWE:** [CWE-1104](https://cwe.mitre.org/data/definitions/1104.html)  
> **OWASP:** [A06:2021-Vulnerable and Outdated Components](https://owasp.org/Top10/A06_2021-Vulnerable_and_Outdated_Components/)


<!-- @rule-summary -->
Disallow deprecated crypto-js library (use native crypto instead)
<!-- @/rule-summary -->

Detects usage of the deprecated `crypto-js` library which is no longer maintained. This rule is part of [`eslint-plugin-node-security`](https://www.npmjs.com/package/eslint-plugin-node-security) and provides LLM-optimized error messages with migration suggestions.

**⚠️ Security warning** | **💡 Provides suggestions** | **📋 Set to warn in `recommended`**

## Quick Summary

| Aspect            | Details                                                                     |
| ----------------- | --------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-1104](https://cwe.mitre.org/data/definitions/1104.html) (Unmaintained) |
| **Severity**      | Medium (security risk)                                                      |
| **Auto-Fix**      | 💡 Suggests native crypto alternatives                                      |
| **Category**      | Security                                                                    |
| **ESLint MCP**    | ✅ Optimized for ESLint MCP integration                                     |
| **Best For**      | Node.js applications using crypto-js                                        |

## Vulnerability and Risk

**Vulnerability:** The `crypto-js` library has not been actively maintained since 2022. The maintainer has explicitly recommended migrating to native crypto implementations. Any future vulnerabilities discovered will NOT be patched.

**Risk:** Using unmaintained cryptography libraries means exposure to unpatched vulnerabilities. The library also has known issues, including CVE-2020-36732 (weak random number generation in versions < 3.2.1).

## Rule Details

This rule detects imports of `crypto-js` via both ES modules (`import`) and CommonJS (`require`).

## Why This Matters

| Risk                  | Impact                                 | Solution                    |
| --------------------- | -------------------------------------- | --------------------------- |
| 🔓 **No Patches**     | Future CVEs will remain unpatched      | Migrate to native crypto    |
| ⚠️ **CVE-2020-36732** | Weak random in versions < 3.2.1        | Use crypto.randomBytes()    |
| 🔒 **Compliance**     | Unmaintained deps fail security audits | Use maintained alternatives |

## Configuration

| Option     | Type                  | Default  | Description                |
| ---------- | --------------------- | -------- | -------------------------- |
| `severity` | `'error'` \| `'warn'` | `'warn'` | Severity level for reports |

```javascript
{
  rules: {
    'node-security/no-cryptojs': ['warn', {
      severity: 'warn'
    }]
  }
}
```

## Examples

### ❌ Incorrect

```typescript
// ES module import
import CryptoJS from 'crypto-js'; // ❌ Deprecated library

// Named imports
import { SHA256, AES } from 'crypto-js'; // ❌ Still using crypto-js

// Sub-module imports
import SHA256 from 'crypto-js/sha256'; // ❌ Also deprecated

// CommonJS
const CryptoJS = require('crypto-js'); // ❌ Same issue
```

### ✅ Correct

```typescript
// Node.js native crypto (Node.js 10+)
import crypto from 'node:crypto';

// SHA-256 hashing
const hash = crypto.createHash('sha256').update(data).digest('hex');

// AES encryption
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);

// Web Crypto API (Node.js 15+ and browsers)
const subtle = globalThis.crypto.subtle;
const hashBuffer = await subtle.digest('SHA-256', data);
```

## Migration Guide

### Common crypto-js to Native Crypto Mappings

| crypto-js                         | Native Node.js crypto                                    |
| --------------------------------- | -------------------------------------------------------- |
| `CryptoJS.SHA256(data)`           | `crypto.createHash('sha256').update(data).digest('hex')` |
| `CryptoJS.SHA512(data)`           | `crypto.createHash('sha512').update(data).digest('hex')` |
| `CryptoJS.MD5(data)`              | `crypto.createHash('md5').update(data).digest('hex')` ⚠️ |
| `CryptoJS.HmacSHA256(data, k)`    | `crypto.createHmac('sha256', k).update(data).digest()`   |
| `CryptoJS.AES.encrypt()`          | `crypto.createCipheriv('aes-256-gcm', key, iv)`          |
| `CryptoJS.lib.WordArray.random()` | `crypto.randomBytes(32)`                                 |

### Phase 1: Discovery

```javascript
{
  rules: {
    'node-security/no-cryptojs': 'warn'
  }
}
```

### Phase 2: Migration

```typescript
// Before (crypto-js)
import CryptoJS from 'crypto-js';
const hash = CryptoJS.SHA256(message).toString();

// After (native crypto)
import crypto from 'node:crypto';
const hash = crypto.createHash('sha256').update(message).digest('hex');
```

### Phase 3: Enforcement

```javascript
{
  rules: {
    'node-security/no-cryptojs': 'error'
  }
}
```

## Security Impact

| Vulnerability          | CWE  | OWASP    | CVSS       | Impact                    |
| ---------------------- | ---- | -------- | ---------- | ------------------------- |
| Unmaintained Component | 1104 | A06:2021 | 5.3 Medium | Unpatched vulnerabilities |
| Weak PRNG (< 3.2.1)    | 338  | A02:2021 | 7.5 High   | Predictable random values |

## Related Rules

- [`no-cryptojs-weak-random`](./no-cryptojs-weak-random.md) - Specific CVE-2020-36732 detection
- [`prefer-native-crypto`](./prefer-native-crypto.md) - Prefer native crypto over all third-party libs

## Known False Positives

If you must use crypto-js for browser compatibility:

```javascript
// Disable for specific file
/* eslint-disable node-security/no-cryptojs */

// Or disable for single line
import CryptoJS from 'crypto-js'; // eslint-disable-line node-security/no-cryptojs
```

## Further Reading

- **[crypto-js npm page](https://www.npmjs.com/package/crypto-js)** - Deprecation notice
- **[Node.js Crypto Documentation](https://nodejs.org/api/crypto.html)** - Native crypto module
- **[Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)** - Browser-compatible crypto
- **[CWE-1104: Unmaintained Third Party Components](https://cwe.mitre.org/data/definitions/1104.html)** - Official CWE entry