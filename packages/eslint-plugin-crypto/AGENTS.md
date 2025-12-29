# AGENTS.md - AI Agent Context for eslint-plugin-crypto

## Plugin Purpose

Security-focused ESLint plugin with **24 rules** for cryptographic best practices. Covers Node.js `crypto`, Web Crypto API, and npm packages (crypto-hash, crypto-random-string, crypto-js).

## Quick Reference

### Core Crypto Rules (8)

| Rule                          | CWE | Detects        | Fix              |
| ----------------------------- | --- | -------------- | ---------------- |
| `no-weak-hash-algorithm`      | 327 | MD5, SHA1, MD4 | SHA-256/512      |
| `no-weak-cipher-algorithm`    | 327 | DES, 3DES, RC4 | AES-256-GCM      |
| `no-deprecated-cipher-method` | 327 | createCipher() | createCipheriv() |
| `no-static-iv`                | 329 | Hardcoded IVs  | randomBytes(16)  |
| `no-ecb-mode`                 | 327 | ECB mode       | GCM or CBC       |
| `no-insecure-key-derivation`  | 916 | PBKDF2 < 100k  | ≥100k iterations |
| `no-hardcoded-crypto-key`     | 321 | Literal keys   | env vars/KMS     |
| `require-random-iv`           | 329 | Non-random IVs | randomBytes()    |

### CVE-Specific Rules (3)

| Rule                           | CVE        | Vulnerability |
| ------------------------------ | ---------- | ------------- |
| `no-insecure-rsa-padding`      | 2023-46809 | Marvin Attack |
| `no-cryptojs-weak-random`      | 2020-36732 | Weak PRNG     |
| `require-secure-pbkdf2-digest` | 2023-46233 | SHA1 PBKDF2   |

### Advanced Security (7)

| Rule                               | CWE | Focus           |
| ---------------------------------- | --- | --------------- |
| `no-math-random-crypto`            | 338 | Insecure PRNG   |
| `no-predictable-salt`              | 331 | Weak salts      |
| `require-authenticated-encryption` | 327 | CBC without MAC |
| `no-key-reuse`                     | 323 | Same key twice  |
| `no-self-signed-certs`             | 295 | TLS bypass      |
| `no-timing-unsafe-compare`         | 208 | Timing attacks  |
| `require-key-length`               | 326 | AES-128/192     |
| `no-web-crypto-export`             | 321 | Key export      |

### Package Rules (6)

| Rule                        | Package              | Issue          |
| --------------------------- | -------------------- | -------------- |
| `no-sha1-hash`              | crypto-hash          | sha1()         |
| `require-sufficient-length` | crypto-random-string | < 32 chars     |
| `no-numeric-only-tokens`    | crypto-random-string | Low entropy    |
| `no-cryptojs`               | crypto-js            | Deprecated     |
| `no-cryptojs-weak-random`   | crypto-js            | CVE-2020-36732 |
| `prefer-native-crypto`      | Various              | Third-party    |

## Fix Patterns

```diff
# Weak Hash
- crypto.createHash('md5')
+ crypto.createHash('sha256')

# RSA Padding (CVE-2023-46809)
- padding: crypto.constants.RSA_PKCS1_PADDING
+ padding: crypto.constants.RSA_PKCS1_OAEP_PADDING

# Math.random for crypto
- const token = Math.random().toString(36)
+ const token = crypto.randomBytes(32).toString('hex')

# Timing-safe compare
- if (userToken === storedToken)
+ if (crypto.timingSafeEqual(Buffer.from(userToken), Buffer.from(storedToken)))

# Authenticated encryption
- crypto.createCipheriv('aes-256-cbc', key, iv)
+ crypto.createCipheriv('aes-256-gcm', key, iv)

# TLS validation
- { rejectUnauthorized: false }
+ { rejectUnauthorized: true }
```

## Presets (5)

| Preset               | Use Case                |
| -------------------- | ----------------------- |
| `recommended`        | Most projects           |
| `strict`             | High-security apps      |
| `cryptojs-migration` | Migrating off crypto-js |
| `nodejs-only`        | Server-side only        |
| `cve-focused`        | Known CVE protection    |

## Architecture

```
src/
├── index.ts          # Plugin entry, 5 configs
├── types/index.ts    # 24 rule option types
└── rules/            # 24 rule directories
    ├── no-weak-hash-algorithm/
    ├── no-insecure-rsa-padding/
    └── ...
```

## CWE Coverage

208, 295, 321, 323, 326, 327, 328, 329, 330, 331, 338, 916, 1104

## Version

1.0.0 (24 rules)
