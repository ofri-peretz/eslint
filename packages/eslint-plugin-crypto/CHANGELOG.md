## 2.2.2 (2026-02-06)

### Bug Fixes

- align codecov component names and update docs components ([0a59a86c](https://github.com/ofri-peretz/eslint/commit/0a59a86c))

### ❤️ Thank You

- Ofri Peretz

## [2.2.1] - 2026-02-02

This was a version bump only for eslint-plugin-crypto to align it with other projects, there were no code changes.

# Changelog

All notable changes to `eslint-plugin-crypto` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### Documentation

- 📘 Launched new documentation site: [eslint.interlace.tools](https://eslint.interlace.tools/)

## [1.0.0] - 2025-12-29

### Added

#### Core Node.js Crypto Rules (8)

- `no-weak-hash-algorithm` - Detect MD5, SHA1, MD4, RIPEMD (CWE-327)
- `no-weak-cipher-algorithm` - Detect DES, 3DES, RC4, Blowfish (CWE-327)
- `no-deprecated-cipher-method` - Detect createCipher/createDecipher (CWE-327)
- `no-static-iv` - Detect hardcoded initialization vectors (CWE-329)
- `no-ecb-mode` - Detect ECB encryption mode (CWE-327)
- `no-insecure-key-derivation` - Detect PBKDF2 < 100k iterations (CWE-916)
- `no-hardcoded-crypto-key` - Detect literal encryption keys (CWE-321)
- `require-random-iv` - Ensure IV from crypto.randomBytes() (CWE-329)

#### CVE-Specific Rules (3)

- `no-insecure-rsa-padding` - **CVE-2023-46809** Marvin Attack detection (CWE-327)
- `no-cryptojs-weak-random` - **CVE-2020-36732** crypto-js weak PRNG (CWE-338)
- `require-secure-pbkdf2-digest` - **CVE-2023-46233** PBKDF2 SHA1 default (CWE-328)

#### Advanced Security Rules (7)

- `no-math-random-crypto` - Detect Math.random() in crypto contexts (CWE-338)
- `no-predictable-salt` - Detect empty/hardcoded salts (CWE-331)
- `require-authenticated-encryption` - Flag CBC/CTR without MAC (CWE-327)
- `no-key-reuse` - Warn on key reuse across operations (CWE-323)
- `no-self-signed-certs` - Detect rejectUnauthorized: false (CWE-295)
- `no-timing-unsafe-compare` - Detect timing-unsafe secret comparison (CWE-208)
- `require-key-length` - Recommend AES-256 over AES-128/192 (CWE-326)
- `no-web-crypto-export` - Warn on key export (CWE-321)

#### Package-Specific Rules (6)

- `no-sha1-hash` - Detect sha1() from crypto-hash (CWE-327)
- `require-sufficient-length` - Require crypto-random-string ≥32 chars (CWE-330)
- `no-numeric-only-tokens` - Warn on type: 'numeric' (CWE-330)
- `no-cryptojs` - Warn on deprecated crypto-js usage (CWE-1104)
- `no-cryptojs-weak-random` - CVE-2020-36732 (CWE-338)
- `prefer-native-crypto` - Recommend native crypto (CWE-1104)

#### Presets (5)

- `recommended` - Balanced security defaults
- `strict` - All 24 rules as errors
- `cryptojs-migration` - For migrating off crypto-js
- `nodejs-only` - Server-side only (no package rules)
- `cve-focused` - Rules targeting specific CVEs

#### Features

- LLM-optimized error messages with CWE references
- Auto-fix suggestions where safe
- OWASP-aligned recommendations
- TypeScript support
- Comprehensive test coverage (302 edge case tests)

### Security

- Covers 13 CWEs: 208, 295, 321, 323, 326, 327, 328, 329, 330, 331, 338, 916, 1104
- Detects 3 specific CVEs: CVE-2023-46809, CVE-2020-36732, CVE-2023-46233
