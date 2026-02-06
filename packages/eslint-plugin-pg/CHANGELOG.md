## 1.4.2 (2026-02-06)

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
