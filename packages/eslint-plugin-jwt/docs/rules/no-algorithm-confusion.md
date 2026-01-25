---
title: no-algorithm-confusion
description: 'no-algorithm-confusion'
category: security
tags: ['security', 'jwt']
---


> Prevent algorithm confusion attacks using symmetric algorithms with asymmetric keys

**🚨 Security rule** | **💡 Provides LLM-optimized guidance** | **⚠️ Set to error in `recommended`**

## Quick Summary

| Aspect            | Details                                                                    |
| ----------------- | -------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-347](https://cwe.mitre.org/data/definitions/347.html)                 |
| **Severity**      | Critical                                                                   |
| **Auto-Fix**      | ❌ No auto-fix available                                                   |
| **Category**   | Security |
| **ESLint MCP**    | ✅ Optimized for ESLint MCP integration                                    |
| **Best For**      | Protecting asymmetric JWT verification from algorithm substitution attacks |

## Rule Details

This rule detects algorithm confusion attacks where symmetric algorithms (HS256, HS384, HS512) are used with asymmetric keys (public keys). An attacker can use the public key as an HMAC secret to forge tokens.

## Examples

### ❌ Incorrect

```javascript
// HS256 with public key - VULNERABLE
jwt.verify(token, publicKey, { algorithms: ['HS256'] });

// Any symmetric algorithm with public key
jwt.verify(token, getPublicKey(), { algorithms: ['HS384'] });
jwt.verify(token, jwksKey, { algorithms: ['HS512'] });
```

### ✅ Correct

```javascript
// Asymmetric algorithm with public key - SAFE
jwt.verify(token, publicKey, { algorithms: ['RS256'] });
jwt.verify(token, publicKey, { algorithms: ['ES256'] });

// Symmetric algorithm with shared secret - SAFE
jwt.verify(token, sharedSecret, { algorithms: ['HS256'] });
jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
```

## How the Attack Works

1. Server uses RS256 (asymmetric) with a public/private key pair
2. Attacker obtains the public key (often publicly available)
3. Attacker creates a token with `alg: "HS256"` signed with the public key as secret
4. Server accepts HS256 in its algorithm list
5. Server verifies using the public key as HMAC secret - attack succeeds

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Key Source Detection Limits

**Why**: The rule uses heuristics (variable names, function patterns) to identify public keys. Novel naming conventions are missed.

```typescript
// ❌ NOT DETECTED - Unusual variable name
const asymKey = fs.readFileSync('public.pem'); // Not recognized as public key
jwt.verify(token, asymKey, { algorithms: ['HS256'] });
```

**Mitigation**: Use consistent naming (`publicKey`, `rsaPublic`). Document key types in comments.

### Dynamic Algorithm Selection

**Why**: Algorithm computed at runtime cannot be statically verified against key type.

```typescript
// ❌ NOT DETECTED - Dynamic algorithm
const algo = getUserPreferredAlgorithm(); // Could return 'HS256'
jwt.verify(token, publicKey, { algorithms: [algo] });
```

**Mitigation**: Use TypeScript literal types for algorithms. Validate algorithm-key pairs at runtime.

### Cross-Module Key Passing

**Why**: Keys imported from other modules cannot be classified.

```typescript
// ❌ NOT DETECTED - Key from another module
import { verificationKey } from './keys';
jwt.verify(token, verificationKey, { algorithms: ['HS256'] }); // Is it public or secret?
```

**Mitigation**: Apply rule across all modules. Use type annotations for key types.

### Key From Configuration Object

**Why**: Properties of configuration objects are not analyzed for key type.

```typescript
// ❌ NOT DETECTED - Key in config
const config = loadConfig();
jwt.verify(token, config.key, { algorithms: ['HS256'] }); // Key type unknown
```

**Mitigation**: Validate key-algorithm pairs at runtime. Use separate config fields for asymmetric vs symmetric keys.

## Further Reading

- [PortSwigger - Algorithm Confusion](https://portswigger.net/web-security/jwt/algorithm-confusion)
- [Auth0 - Critical JWT Vulnerabilities](https://auth0.com/blog/critical-vulnerabilities-in-json-web-token-libraries/)
