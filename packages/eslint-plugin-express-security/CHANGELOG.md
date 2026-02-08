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
