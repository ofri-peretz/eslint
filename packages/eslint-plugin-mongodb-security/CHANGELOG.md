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
