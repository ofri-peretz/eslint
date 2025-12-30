# AGENTS.md

> Context for AI coding agents working on eslint-plugin-crypto

## Setup Commands

```bash
# Install dependencies (from monorepo root)
pnpm install

# Build this package
nx build eslint-plugin-crypto

# Run tests
nx test eslint-plugin-crypto

# Run tests with coverage
nx test eslint-plugin-crypto --coverage

# Lint this package
nx lint eslint-plugin-crypto
```

## Code Style

- TypeScript strict mode with `@interlace/eslint-devkit` types
- Use `AST_NODE_TYPES` constants, never string literals for node types
- Use `formatLLMMessage()` for all rule error messages
- Include CWE, CVSS, CVE references in every security message
- Use `c8 ignore` comments with documented reasons for untestable code
- Single-pass AST traversal patterns (O(n) complexity)

## Testing Instructions

- Tests use `@typescript-eslint/rule-tester` with Vitest
- Each rule has `index.ts` (implementation) and `*.test.ts` (tests) in same directory
- Run specific rule test: `nx test eslint-plugin-crypto --testPathPattern="no-weak-hash"`
- Coverage target: ≥90% lines, ≥95% functions
- All tests must pass before committing

## Project Structure

```
src/
├── index.ts          # Plugin entry, 5 configs
├── types/index.ts    # 24 rule option types
└── rules/            # 24 rule directories
```

## Plugin Purpose

Security-focused ESLint plugin with **24 rules** for cryptographic best practices. Covers Node.js `crypto`, Web Crypto API, and npm packages (crypto-hash, crypto-random-string, crypto-js).

## Rule Categories

### Core Node.js Crypto Rules (8)

| Rule                          | CWE | Detects        | Fix              |
| ----------------------------- | --- | -------------- | ---------------- |
| `no-weak-hash-algorithm`      | 327 | MD5, SHA1, MD4 | SHA-256/512      |
| `no-weak-cipher-algorithm`    | 327 | DES, 3DES, RC4 | AES-256-GCM      |
| `no-deprecated-cipher-method` | 327 | createCipher() | createCipheriv() |
| `no-static-iv`                | 329 | Hardcoded IVs  | randomBytes(16)  |
| `no-ecb-mode`                 | 327 | ECB mode       | GCM or CBC       |
| `no-insecure-key-derivation`  | 916 | PBKDF2 <100k   | ≥100k iterations |
| `no-hardcoded-crypto-key`     | 321 | Literal keys   | env vars/KMS     |
| `require-random-iv`           | 329 | Non-random IVs | randomBytes()    |

### CVE-Specific Rules (3)

| Rule                           | CVE            | Vulnerability |
| ------------------------------ | -------------- | ------------- |
| `no-insecure-rsa-padding`      | CVE-2023-46809 | Marvin Attack |
| `no-cryptojs-weak-random`      | CVE-2020-36732 | Weak PRNG     |
| `require-secure-pbkdf2-digest` | CVE-2023-46233 | SHA1 PBKDF2   |

## Common Fix Patterns

```typescript
// Weak Hash
// BAD: crypto.createHash('md5')
// GOOD: crypto.createHash('sha256')

// RSA Padding (CVE-2023-46809)
// BAD: padding: crypto.constants.RSA_PKCS1_PADDING
// GOOD: padding: crypto.constants.RSA_PKCS1_OAEP_PADDING

// Math.random for crypto
// BAD: const token = Math.random().toString(36)
// GOOD: const token = crypto.randomBytes(32).toString('hex')

// Timing-safe compare
// BAD: if (userToken === storedToken)
// GOOD: if (crypto.timingSafeEqual(Buffer.from(userToken), Buffer.from(storedToken)))

// Authenticated encryption
// BAD: crypto.createCipheriv('aes-256-cbc', key, iv)
// GOOD: crypto.createCipheriv('aes-256-gcm', key, iv)
```

## Presets (5)

| Preset               | Use Case                |
| -------------------- | ----------------------- |
| `recommended`        | Most projects           |
| `strict`             | High-security apps      |
| `cryptojs-migration` | Migrating off crypto-js |
| `nodejs-only`        | Server-side only        |
| `cve-focused`        | Known CVE protection    |

## CWE Coverage

208, 295, 321, 323, 326, 327, 328, 329, 330, 331, 338, 916, 1104

## Security Considerations

- Detects 3 specific CVEs: CVE-2023-46809, CVE-2020-36732, CVE-2023-46233
- Marvin Attack detection for RSA padding
- crypto-js weak PRNG detection
