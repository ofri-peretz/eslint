# AGENTS.md - AI Assistant Guide for eslint-plugin-jwt

> This document optimizes AI model interactions with eslint-plugin-jwt.

## Plugin Overview

**eslint-plugin-jwt** is a comprehensive JWT security ESLint plugin with 13 rules covering algorithm attacks, replay prevention, and claim validation. It targets 6 major Node.js JWT libraries.

## Quick Reference

### Installation

```bash
npm install --save-dev eslint-plugin-jwt
```

### Configuration

```javascript
// eslint.config.js
import jwt from 'eslint-plugin-jwt';
export default [jwt.configs.recommended];
```

## Rule Categories

### Critical (Algorithm Attacks)

| Rule                     | Fix Pattern                                 |
| ------------------------ | ------------------------------------------- |
| `no-algorithm-none`      | Replace `['none']` with `['RS256']`         |
| `no-algorithm-confusion` | Use RS256/ES256 with public keys, not HS256 |

### High (Verification & Secrets)

| Rule                          | Fix Pattern                                |
| ----------------------------- | ------------------------------------------ |
| `require-algorithm-whitelist` | Add `{ algorithms: ['RS256'] }` to verify  |
| `no-decode-without-verify`    | Replace `jwt.decode()` with `jwt.verify()` |
| `no-weak-secret`              | Use `process.env.JWT_SECRET` (32+ chars)   |
| `no-hardcoded-secret`         | Move secret to environment variable        |
| `no-timestamp-manipulation`   | Remove `noTimestamp: true` option          |

### Medium (Claims)

| Rule                          | Fix Pattern                                 |
| ----------------------------- | ------------------------------------------- |
| `require-expiration`          | Add `{ expiresIn: '1h' }` to sign           |
| `require-issued-at`           | Keep default iat (don't disable)            |
| `require-issuer-validation`   | Add `{ issuer: 'https://...' }` to verify   |
| `require-audience-validation` | Add `{ audience: 'https://...' }` to verify |
| `require-max-age`             | Add `{ maxAge: '1h' }` to verify            |
| `no-sensitive-payload`        | Remove PII from token payload               |

## Common Fix Patterns

### Algorithm None Attack (CVE-2022-23540)

```javascript
// Before (vulnerable)
jwt.verify(token, secret, { algorithms: ['none'] });

// After (secure)
jwt.verify(token, secret, { algorithms: ['RS256'] });
```

### Algorithm Confusion Attack

```javascript
// Before (vulnerable - symmetric with public key)
jwt.verify(token, publicKey, { algorithms: ['HS256'] });

// After (secure - asymmetric with public key)
jwt.verify(token, publicKey, { algorithms: ['RS256'] });
```

### Hardcoded Secret

```javascript
// Before (vulnerable)
jwt.sign(payload, 'my-secret-key');

// After (secure)
jwt.sign(payload, process.env.JWT_SECRET);
```

### Missing Expiration

```javascript
// Before (no expiration)
jwt.sign({ sub: 'user' }, secret);

// After (with expiration)
jwt.sign({ sub: 'user' }, secret, { expiresIn: '1h' });
```

### Replay Attack Prevention (LightSEC 2025)

```javascript
// Before (vulnerable to replay)
jwt.sign(payload, secret, { noTimestamp: true });

// After (replay-resistant)
jwt.sign(payload, secret); // iat auto-added
jwt.verify(token, secret, { maxAge: '1h' }); // freshness check
```

## Library Detection Patterns

The plugin detects these method calls:

- **Sign**: `jwt.sign()`, `signJWT()`, `SignJWT()`
- **Verify**: `jwt.verify()`, `jwtVerify()`, `verifyJWT()`
- **Decode**: `jwt.decode()`, `jwtDecode()`, `decodeJWT()`

## CWE Mappings

| CWE     | Rules                                                         |
| ------- | ------------------------------------------------------------- |
| CWE-287 | require-issuer-validation, require-audience-validation        |
| CWE-294 | require-issued-at, no-timestamp-manipulation, require-max-age |
| CWE-326 | no-weak-secret                                                |
| CWE-345 | no-decode-without-verify                                      |
| CWE-347 | no-algorithm-none, no-algorithm-confusion                     |
| CWE-359 | no-sensitive-payload                                          |
| CWE-613 | require-expiration                                            |
| CWE-757 | require-algorithm-whitelist                                   |
| CWE-798 | no-hardcoded-secret                                           |

## For AI Assistants

When fixing JWT security issues:

1. Check which library is being used
2. Apply the appropriate fix pattern
3. Ensure all verify() calls have explicit algorithms
4. Move secrets to environment variables
5. Add expiration to all sign() calls
6. Validate issuer and audience in verify()
