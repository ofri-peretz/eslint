## [1.2.3] - 2026-02-08

## 1.2.4

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

This was a version bump only for eslint-plugin-nestjs-security to align it with other projects, there were no code changes.

# Changelog

All notable changes to `eslint-plugin-nestjs-security` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-29

### Added

#### Authorization & Access Control Rules (2)

- `require-guards` - Require @UseGuards decorator on controllers/handlers (CWE-284)
- `no-exposed-private-fields` - Detect exposed sensitive fields in DTOs/entities (CWE-200)

#### Input Validation Rules (2)

- `no-missing-validation-pipe` - Require ValidationPipe for DTO parameters (CWE-20)
- `require-class-validator` - Require class-validator decorators on DTO properties (CWE-20)

#### Rate Limiting & DoS Rules (1)

- `require-throttler` - Require ThrottlerGuard/@Throttle for rate limiting (CWE-770)

#### Presets (2)

- `recommended` - Balanced security defaults
- `strict` - All 5 rules as errors

#### Features

- LLM-optimized error messages with CWE references
- OWASP Top 10 2021 alignment (A01, A03, A05)
- Decorator-aware detection (@UseGuards, @UsePipes, @Throttle, @Exclude)
- `assumeGlobal*` options for teams using global configuration
- Support for public/skip decorators (@Public, @SkipAuth, @AllowAnonymous, @SkipThrottle)
- TypeScript support
- Comprehensive test coverage (79 tests, 96.09% line coverage)

### Security

- Covers 4 CWEs: 20, 200, 284, 770
- Maps to OWASP Top 10 2021: A01, A03, A05
