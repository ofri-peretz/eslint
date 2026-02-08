## [8.3.0] - 2026-02-08

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
