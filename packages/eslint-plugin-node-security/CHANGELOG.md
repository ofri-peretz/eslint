## [4.0.4] - 2026-02-08

### Bug Fixes

- align codecov component IDs with full package names ([2831b968](https://github.com/ofri-peretz/eslint/commit/2831b968))
- resolve all benchmark FN/FP across security rules ([45ffb791](https://github.com/ofri-peretz/eslint/commit/45ffb791))
- **rules:** reduce false positives across security rules ([c192233c](https://github.com/ofri-peretz/eslint/commit/c192233c))

### Documentation

- fix changelog header format across all packages ([c3a15082](https://github.com/ofri-peretz/eslint/commit/c3a15082))

### ❤️ Thank You

- Ofri Peretz

## [4.0.3] - 2026-02-06

### Bug Fixes

- ⚠️  **rules:** reduce false positives across security rules ([af4ca0e7](https://github.com/ofri-peretz/eslint/commit/af4ca0e7))
- align codecov component names and update docs components ([0a59a86c](https://github.com/ofri-peretz/eslint/commit/0a59a86c))

### ⚠️  Breaking Changes

- **rules:** Some previously flagged patterns are now correctly allowed ([af4ca0e7](https://github.com/ofri-peretz/eslint/commit/af4ca0e7))

### ❤️ Thank You

- Ofri Peretz

## [4.0.2] - 2026-02-02

This was a version bump only for eslint-plugin-node-security to align it with other projects, there were no code changes.

# Changelog

All notable changes to `eslint-plugin-node-security` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### Documentation

- 📘 Launched new documentation site: [eslint.interlace.tools](https://eslint.interlace.tools/)
- 📝 Achieved 100% documentation parity (both .md and .mdx files)

## [4.0.1] - 2026-02-02

This was a version bump only for eslint-plugin-node-security to align it with other projects, there were no code changes.

## [4.0.0] - 2026-02-02

This was a version bump only for eslint-plugin-node-security to align it with other projects, there were no code changes.

## [1.0.0] - 2026-01-26

### Added

- Initial stable release with 31 Node.js security rules
- LLM-optimized error messages with CWE references and OWASP mapping
- 100% test coverage across all rules
- ESLint 8 and ESLint 9 flat config support
- TypeScript type definitions for all rule options

### Rule Categories

#### Cryptography Rules (12)

- `no-sha1-hash` - Disallow SHA-1 for security-sensitive operations (CWE-328)
- `no-weak-hash-algorithm` - Disallow MD5, SHA-1 for cryptographic hashing (CWE-328)
- `no-ecb-mode` - Disallow ECB mode for block ciphers (CWE-327)
- `no-static-iv` - Disallow static initialization vectors (CWE-329)
- `no-insecure-key-derivation` - Require secure key derivation functions (CWE-916)
- `no-insecure-rsa-padding` - Require OAEP padding for RSA (CWE-780)
- `no-self-signed-certs` - Detect disabled TLS certificate validation (CWE-295)
- `no-timing-unsafe-compare` - Require timing-safe comparison for secrets (CWE-208)
- `no-cryptojs` - Prefer native crypto over CryptoJS (CWE-327)
- `no-cryptojs-weak-random` - Disallow CryptoJS weak random (CWE-338)
- `no-deprecated-cipher-method` - Disallow deprecated crypto methods (CWE-327)
- `prefer-native-crypto` - Prefer Node.js native crypto module

#### File System Rules (7)

- `no-path-traversal` - Prevent path traversal attacks (CWE-22)
- `no-unsafe-file-permissions` - Enforce secure file permissions (CWE-732)
- `no-symlink-attacks` - Prevent symlink-based attacks (CWE-59)
- `require-file-validation` - Require file type validation (CWE-434)
- `no-temp-file-exposure` - Prevent temp file security issues (CWE-377)
- `no-hardcoded-paths` - Prevent hardcoded sensitive paths (CWE-426)
- `require-safe-path-join` - Require path.join for path construction (CWE-22)

#### Process & Shell Rules (6)

- `no-child-process-injection` - Prevent command injection (CWE-78)
- `no-shell-exec` - Disallow shell: true in spawn options (CWE-78)
- `no-env-exposure` - Prevent environment variable exposure (CWE-214)
- `require-process-sanitization` - Require input sanitization for process args (CWE-88)
- `no-unsafe-exec` - Disallow exec with dynamic input (CWE-78)
- `no-eval-alternatives` - Disallow Function constructor, vm runInContext (CWE-95)

#### Network Rules (6)

- `require-tls-verification` - Require TLS certificate validation (CWE-295)
- `no-dns-rebinding` - Prevent DNS rebinding attacks (CWE-350)
- `no-ssrf` - Prevent Server-Side Request Forgery (CWE-918)
- `require-https` - Require HTTPS for external requests (CWE-319)
- `no-unsafe-redirect` - Prevent open redirects (CWE-601)
- `require-host-validation` - Require host header validation (CWE-20)

### Presets

- `recommended` - Balanced security for Node.js applications
- `strict` - All rules as errors
- `crypto` - Cryptography-focused subset
- `filesystem` - File system security subset
- `network` - Network security subset

### Features

- Comprehensive detection patterns for Node.js core modules
- Support for popular libraries (fs-extra, glob, rimraf)
- Auto-fix capabilities where safe
- ESLint MCP integration for AI assistants
