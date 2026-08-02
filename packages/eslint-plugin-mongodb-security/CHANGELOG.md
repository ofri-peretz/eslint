## [8.3.0] - 2026-02-08

## 8.2.8

### Patch Changes

- [#294](https://github.com/ofri-peretz/eslint/pull/294) [`659f6dc`](https://github.com/ofri-peretz/eslint/commit/659f6dc0181b03b675f72b5949fcf123dd066358) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Rewrite `description` and `keywords` on every published package for npm search discovery. npm ranks on name, description, and keywords, and the registry only picks up these fields at publish — so this is metadata-only and takes effect for each package on its next release.

  **Descriptions now lead with the search phrase.** Every one starts `ESLint plugin for <the thing you'd search>` instead of a brand-first or category-first framing, and names the concrete vulnerabilities the plugin actually detects. Three were corrected while doing so:

  - `eslint-plugin-import-next` claimed "100x faster no-cycle detection". No 100x measurement exists: `CLAIMS.md` records **3.1x end-to-end** (8x in pure rule execution) on a 5,483-file React codebase, and the highest number in any benchmark result is 54.9x on the synthetic corpus. The description now states the real-codebase figure.
  - `eslint-plugin-secure-coding` claimed SQL injection, XSS and CSRF coverage — none of which are its rules. It now names what it does detect: LDAP, XPath, XXE, GraphQL and template injection, unsafe deserialization, ReDoS, missing authentication, and PII in logs.
  - `eslint-plugin-secure-coding` ("89 rules") and `eslint-plugin-react-a11y` ("37 rules") hard-coded rule counts that had drifted from reality. Counts are generated into `interlace-numbers.json`; hand-typed copies are removed rather than corrected.

  **Keywords now match the vocabulary of the plugins that rank.** `eslint-plugin-security`, `eslint-plugin-jsx-a11y`, `eslint-plugin-n` and `eslint-plugin-import` all carry the `eslint` / `eslintplugin` / `eslint-plugin` trio — six of our packages were missing `eslintplugin`, and every one now carries all three plus `static-analysis`, `linting` and `code-quality`. Security plugins add `sast`, `appsec` and `vulnerability`; `node-security` and `secure-coding` also carry `nodesecurity`, the exact keyword `eslint-plugin-security` ranks on. Each plugin gained the CWE identifiers and attack names for what it detects (`cwe-78` command injection, `cwe-22` path traversal, `cwe-89` SQL injection, `cwe-79` XSS, `cwe-347` JWT algorithm confusion, `cwe-352` CSRF, `cwe-943` NoSQL injection), and `node-security` gained the crypto vocabulary it had been missing entirely despite absorbing the crypto rule set (`crypto`, `cryptography`, `weak-hash`, `md5`, `sha1`, `timing-attack`).

  No rule behavior, exports, or configuration changes.

- Updated dependencies [[`e1cdf83`](https://github.com/ofri-peretz/eslint/commit/e1cdf83e3db761907f0ab06f7fc6c1f1da7513a5), [`659f6dc`](https://github.com/ofri-peretz/eslint/commit/659f6dc0181b03b675f72b5949fcf123dd066358)]:
  - @interlace/eslint-devkit@1.4.3

## 8.2.7

### Patch Changes

- [#274](https://github.com/ofri-peretz/eslint/pull/274) [`acdd2ad`](https://github.com/ofri-peretz/eslint/commit/acdd2ad257c2d7b6559476d05f6cc9de48da14b5) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Widen optional peer ranges to accept mongoose ^9 and mongodb driver ^7. The rules lint call patterns statically and never import either library, and the interface-compatibility suite passes against mongoose 9.7 / mongodb 7.5 — the old caps just broke `npm install` in current-major repos.

## 8.2.6

### Patch Changes

- [#269](https://github.com/ofri-peretz/eslint/pull/269) [`7028fe2`](https://github.com/ofri-peretz/eslint/commit/7028fe2668a42266d831014184dcef70e73101ad) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - docs: dual-logo README header (Interlace mark + ESLint mark side by side) and closing Interlace footer — refreshes the README rendered on npmjs.com. No runtime changes.

- Updated dependencies [[`7028fe2`](https://github.com/ofri-peretz/eslint/commit/7028fe2668a42266d831014184dcef70e73101ad)]:
  - @interlace/eslint-devkit@1.4.2

## 8.2.5

### Patch Changes

- [#252](https://github.com/ofri-peretz/eslint/pull/252) [`d67e395`](https://github.com/ofri-peretz/eslint/commit/d67e3953c2748ad36e6aebe0f24b1d04e518b4d0) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix Codecov badge showing "unknown" — switch from flag to component URL format

## 8.2.4

### Patch Changes

- [#143](https://github.com/ofri-peretz/eslint/pull/143) [`213cde1`](https://github.com/ofri-peretz/eslint/commit/213cde190ff2aea49ca7c1b533170940f879d9b4) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - fix(no-missing-null-checks): eliminate 53 false positives via three new narrowing patterns

  Rules that were recognized as null guards are now correctly identified as safe:
  1. **Truthy if guard** — `if (obj) { obj.prop }` — direct truthy check proves non-null. Also covers chains: `if (response)` protects `response.data.items`.
  2. **Short-circuit AND** — `obj && obj.prop` — right side of `&&` only runs when left is truthy.
  3. **Ternary consequent** — `obj ? obj.prop : fallback` — truthy test guards the consequent.

  Also: bumped `beforeAll` timeout to 30 seconds in 7 compatibility test files (`__compatibility__/*.spec.ts`). Native-addon packages routinely exceed the previous 10-second default on a cold ESM load.

- Updated dependencies [[`736a5fe`](https://github.com/ofri-peretz/eslint/commit/736a5fed47e673f6157ea900b29fe2a54e4bc7df)]:
  - @interlace/eslint-devkit@1.4.1

### Added

- **no-hardcoded-connection-string**: Detect hardcoded `mongodb://` and `mongodb+srv://` URIs in string and template literals (CWE-798, CVSS 7.5)
- **no-hardcoded-credentials**: Flag `user`, `username`, `pass`, `password`, `auth` properties with literal string values (CWE-798, CVSS 7.5)
- **no-debug-mode-production**: Detect `mongoose.set('debug', true)` calls exposing query details (CWE-489, CVSS 3.1)
- **no-unsafe-where**: Detect `$where` operator in object literals and `.where('$where')` method calls — RCE vector (CWE-943, CVSS 9.0)
- **no-operator-injection**: Flag dangerous MongoDB operators (`$ne`, `$gt`, `$lt`, etc.) when values reference user input (CWE-943, CVSS 9.1)
- **no-unbounded-find**: Require `.limit()` on `find()`/`findOne()` queries to prevent resource exhaustion (CWE-400, CVSS 4.3)
- **require-tls-connection**: Require `tls: true` or `ssl: true` in `connect()`/`createConnection()` options (CWE-295, CVSS 7.4)
- **no-bypass-middleware**: Flag Mongoose methods that bypass pre/post middleware hooks (`updateOne`, `deleteMany`, `insertMany`, `bulkWrite`, etc.) (CWE-284, CVSS 5.3)
- Comprehensive test suites for all 8 rules (163 total tests)
- Test coverage improved from 72.61% to 91.30% lines

## [8.2.3] - 2026-02-08

### Bug Fixes

- align codecov component IDs with full package names ([2831b968](https://github.com/ofri-peretz/eslint/commit/2831b968))

### Documentation

- fix changelog header format across all packages ([c3a15082](https://github.com/ofri-peretz/eslint/commit/c3a15082))

### ❤️ Thank You

- Ofri Peretz

## [8.2.2] - 2026-02-06

### Bug Fixes

- align codecov component names and update docs components ([0a59a86c](https://github.com/ofri-peretz/eslint/commit/0a59a86c))

### ❤️ Thank You

- Ofri Peretz

## [8.2.1] - 2026-02-02

This was a version bump only for eslint-plugin-mongodb-security to align it with other projects, there were no code changes.

# Changelog

All notable changes to `eslint-plugin-mongodb-security` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-09

### Added

- Initial release with 16 security rules
- **NoSQL Injection Prevention** (4 rules)
  - `no-unsafe-query` - Prevents string concatenation in MongoDB queries
  - `no-operator-injection` - Prevents $ne, $gt, $lt injection attacks
  - `no-unsafe-where` - Prevents $where operator RCE (CVE-2025-23061, CVE-2024-53900)
  - `no-unsafe-regex-query` - Prevents ReDoS via $regex
- **Credentials & Connection Security** (4 rules)
  - `no-hardcoded-connection-string` - Prevents credentials in connection URIs
  - `no-hardcoded-credentials` - Prevents hardcoded auth options
  - `require-tls-connection` - Requires TLS for production connections
  - `require-auth-mechanism` - Requires explicit SCRAM-SHA-256
- **Mongoose ODM Security** (5 rules)
  - `require-schema-validation` - Requires Mongoose schema validators
  - `no-select-sensitive-fields` - Prevents returning password/token fields
  - `no-bypass-middleware` - Prevents bypassing pre/post hooks
  - `no-unsafe-populate` - Prevents user-controlled populate()
  - `require-lean-queries` - Suggests .lean() for read-only queries
- **Best Practices** (3 rules)
  - `no-unbounded-find` - Requires limit() on find queries
  - `require-projection` - Requires field projection
  - `no-debug-mode-production` - Prevents debug mode in production
- Full support for `mongodb`, `mongoose`, `mongodb-client-encryption`, `@typegoose/typegoose`
- AI-optimized error messages with CWE and OWASP references
- Three configuration presets: `recommended`, `strict`, `mongoose`
- OWASP Top 10 2021 mapping (A01-A07 coverage)
