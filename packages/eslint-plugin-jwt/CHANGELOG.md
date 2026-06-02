## [2.2.3] - 2026-02-08

## 2.2.4

### Patch Changes

- [#143](https://github.com/ofri-peretz/eslint/pull/143) [`213cde1`](https://github.com/ofri-peretz/eslint/commit/213cde190ff2aea49ca7c1b533170940f879d9b4) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - fix(no-missing-null-checks): eliminate 53 false positives via three new narrowing patterns

  Rules that were recognized as null guards are now correctly identified as safe:
  1. **Truthy if guard** — `if (obj) { obj.prop }` — direct truthy check proves non-null. Also covers chains: `if (response)` protects `response.data.items`.
  2. **Short-circuit AND** — `obj && obj.prop` — right side of `&&` only runs when left is truthy.
  3. **Ternary consequent** — `obj ? obj.prop : fallback` — truthy test guards the consequent.

  Also: bumped `beforeAll` timeout to 30 seconds in 7 compatibility test files (`__compatibility__/*.spec.ts`). Native-addon packages routinely exceed the previous 10-second default on a cold ESM load.

- Updated dependencies [[`736a5fe`](https://github.com/ofri-peretz/eslint/commit/736a5fed47e673f6157ea900b29fe2a54e4bc7df)]:
  - @interlace/eslint-devkit@1.4.1

### Bug Fixes

- align codecov component IDs with full package names ([2831b968](https://github.com/ofri-peretz/eslint/commit/2831b968))

### Documentation

- fix changelog header format across all packages ([c3a15082](https://github.com/ofri-peretz/eslint/commit/c3a15082))

### ❤️ Thank You

- Ofri Peretz

## [2.2.2] - 2026-02-06

### Bug Fixes

- align codecov component names and update docs components ([0a59a86c](https://github.com/ofri-peretz/eslint/commit/0a59a86c))

### ❤️ Thank You

- Ofri Peretz

## [2.2.1] - 2026-02-02

This was a version bump only for eslint-plugin-jwt to align it with other projects, there were no code changes.

# Changelog

All notable changes to eslint-plugin-jwt will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-29

### Added

#### Core Security Rules (7)

- `no-algorithm-none` - Prevent `alg:"none"` attack (CVE-2022-23540, CWE-347)
- `no-algorithm-confusion` - Prevent RS256→HS256 key confusion (CWE-347)
- `require-algorithm-whitelist` - Require explicit algorithm specification (CWE-757)
- `no-decode-without-verify` - Prevent trusting decoded payloads (CWE-345)
- `no-weak-secret` - Require 256-bit minimum secrets (CWE-326)
- `no-hardcoded-secret` - Prevent secrets in source code (CWE-798)
- `require-expiration` - Require `exp` claim or `expiresIn` (CWE-613)

#### 2025 Research Rules (6)

Based on LightSEC 2025 "Back to the Future" attack research:

- `require-issued-at` - Require `iat` claim for freshness (CWE-294)
- `require-issuer-validation` - Require issuer validation (CWE-287)
- `require-audience-validation` - Require audience validation (CWE-287)
- `no-timestamp-manipulation` - Prevent `noTimestamp: true` (CWE-294)
- `require-max-age` - Require maxAge for replay prevention (CWE-294)
- `no-sensitive-payload` - Prevent PII in token payload (CWE-359)

#### Configuration Presets

- `recommended` - Balanced security (critical=error, high=warn)
- `strict` - Maximum security with all 13 rules enabled
- `legacy` - Migration mode with only critical rules

#### Library Support

- jsonwebtoken
- jose
- express-jwt
- @nestjs/jwt
- jwks-rsa
- jwt-decode

### Features

- AI-optimized error messages using `formatLLMMessage`
- CWE references for all rules (9 CWEs covered)
- OWASP Top 10 2021 coverage matrix (6 categories)
- Full TypeScript support
- Comprehensive test coverage (248 edge case tests)
