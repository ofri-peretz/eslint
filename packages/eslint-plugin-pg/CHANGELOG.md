## [1.4.3] - 2026-02-08

## 1.4.4

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
- resolve all benchmark FN/FP across security rules ([45ffb791](https://github.com/ofri-peretz/eslint/commit/45ffb791))

### Documentation

- fix changelog header format across all packages ([c3a15082](https://github.com/ofri-peretz/eslint/commit/c3a15082))

### ❤️ Thank You

- Ofri Peretz

## [1.4.2] - 2026-02-06

### Bug Fixes

- align codecov component names and update docs components ([0a59a86c](https://github.com/ofri-peretz/eslint/commit/0a59a86c))

### ❤️ Thank You

- Ofri Peretz

## [1.4.1] - 2026-02-02

This was a version bump only for eslint-plugin-pg to align it with other projects, there were no code changes.

# Changelog

All notable changes to `eslint-plugin-pg` will be documented in this file.

## [0.0.1] - 2024-12-20

### Added

- Initial release with 13 rules for PostgreSQL security and best practices

#### Security Rules (6)

- `no-unsafe-query` - Prevents SQL injection via string interpolation
- `no-insecure-ssl` - Prevents disabling SSL certificate validation
- `no-hardcoded-credentials` - Prevents hardcoded passwords in config
- `no-unsafe-search-path` - Prevents dynamic search_path hijacking
- `no-unsafe-copy-from` - Prevents COPY FROM file path exposure
- `no-transaction-on-pool` - Prevents transaction commands on pool

#### Resource Management Rules (3)

- `no-missing-client-release` - Ensures pool clients are released
- `prevent-double-release` - Prevents double client.release()
- `no-floating-query` - Ensures query promises are handled

#### Quality & Performance Rules (4)

- `check-query-params` - Validates parameter count matches placeholders
- `no-select-all` - Discourages SELECT \*
- `prefer-pool-query` - Suggests pool.query() for simple queries
- `no-batch-insert-loop` - Prevents N+1 mutation queries

#### Presets

- `recommended` - Balanced security and quality settings
- `strict` - All rules as errors

#### Documentation

- Full documentation for all 13 rules
- AGENTS.md for AI assistant integration
- Benchmark folder for capability demonstration
