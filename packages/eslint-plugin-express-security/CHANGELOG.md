## [1.2.3] - 2026-02-08

## 1.3.3

### Patch Changes

- [#252](https://github.com/ofri-peretz/eslint/pull/252) [`d67e395`](https://github.com/ofri-peretz/eslint/commit/d67e3953c2748ad36e6aebe0f24b1d04e518b4d0) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix Codecov badge showing "unknown" — switch from flag to component URL format

## 1.3.2

### Patch Changes

- [#225](https://github.com/ofri-peretz/eslint/pull/225) [`34ff5a8`](https://github.com/ofri-peretz/eslint/commit/34ff5a8e6f5126c5d1c0a524759e0af2b5476b46) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - CI-only: pin all coverage thresholds at 100% (integration target, merges last).

## 1.3.1

### Patch Changes

- [#213](https://github.com/ofri-peretz/eslint/pull/213) [`391dbe6`](https://github.com/ofri-peretz/eslint/commit/391dbe6b39f78d549379218567cb959649f8c614) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Align every security rule's `meta.docs.cvss` to the CVSS its finding actually
  emits. The emitted machine-readable message sources its `CVSS:x` from
  `CWE_MAPPING` via `formatLLMMessage` → `enrichFromCWE`, but the static
  `meta.docs.cvss` documentation field had drifted on 45 rules across these 7
  plugins — e.g. `no-hardcoded-credentials` documented `9.5` while emitting
  `CVSS:9.8` (the value the published article and SARIF/LLM consumers already
  read).

  This corrects the **documentation metadata only** — no emitted finding changes.
  Locked by `security-cvss-docs-consistency.lock.test.ts` (cross-plugin: every
  security rule's `meta.docs.cvss` must equal the CVSS it emits), the
  `no-hardcoded-credentials` rule lock (real ESLint `Linter` emission), and a
  devkit `enrichFromCWE` contract test pinning `CWE-798 → 9.8`.

  Follow-up (not in scope): 50 security rules document a CVSS that never appears
  in any emitted message (their messages carry no CWE), and several rules emit the
  generic CWE score where a rule-specific score may be warranted — both change
  emitted output and are separate decisions.

## 1.3.0

### Minor Changes

- [#169](https://github.com/ofri-peretz/eslint/pull/169) [`ae39ec5`](https://github.com/ofri-peretz/eslint/commit/ae39ec52bf619351e6217a823014fc05bb97d618) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - feat: add `no-user-controlled-redirect` rule — structural CWE-601 open redirect detection

  Fires on `res.redirect(req.query.*)`, `res.redirect(req.body.*)`, and `res.redirect(req.params.*)` — an AST-structural check that passes the naming-heuristic litmus test (rename `res`/`req` to any identifier and the rule still fires, because detection is on the member-access chain, not on variable names). Severity: `error` in flagship config.

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

## [1.2.2] - 2026-02-06

### Bug Fixes

- align codecov component names and update docs components ([0a59a86c](https://github.com/ofri-peretz/eslint/commit/0a59a86c))

### ❤️ Thank You

- Ofri Peretz

## [1.2.1] - 2026-02-02

This was a version bump only for eslint-plugin-express-security to align it with other projects, there were no code changes.

# Changelog

All notable changes to `eslint-plugin-express-security` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### Documentation

- 📘 Launched new documentation site: [eslint.interlace.tools](https://eslint.interlace.tools/)

## [1.0.0] - 2025-12-29

### Added

#### Headers & CORS Rules (4)

- `require-helmet` - Require helmet middleware for security headers (CWE-693)
- `no-permissive-cors` - Detect wildcard CORS origins (CWE-942)
- `no-cors-credentials-wildcard` - Block credentials: true with wildcard origin (CWE-942)
- `require-express-body-parser-limits` - Require body parser size limits (CWE-770)

#### CSRF & Cookies Rules (2)

- `require-csrf-protection` - Require CSRF middleware for state-changing routes (CWE-352)
- `no-insecure-cookie-options` - Detect missing Secure/HttpOnly cookie attributes (CWE-614)

#### Rate Limiting & DoS Rules (2)

- `require-rate-limiting` - Require rate limiting middleware (CWE-770)
- `no-express-unsafe-regex-route` - Detect ReDoS-vulnerable regex patterns (CWE-1333)

#### GraphQL Rules (1)

- `no-graphql-introspection-production` - Disable GraphQL introspection in production (CWE-200)

#### Presets (4)

- `recommended` - Balanced security defaults
- `strict` - All 9 rules as errors
- `api` - HTTP/API security rules only
- `graphql` - GraphQL-specific rules only

#### Features

- LLM-optimized error messages with CWE references
- OWASP Top 10 2021 alignment (A01, A03, A05, A07)
- Middleware-aware detection (helmet, cors, csurf, express-rate-limit)
- TypeScript support with exported option types
- Comprehensive test coverage (132 tests, 93.15% line coverage)

### Security

- Covers 6 CWEs: 200, 352, 614, 693, 770, 942, 1333
- Maps to OWASP Top 10 2021: A01, A03, A05, A07
