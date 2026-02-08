## [1.2.2] - 2026-02-06

### Bug Fixes

- align codecov component names and update docs components ([0a59a86c](https://github.com/ofri-peretz/eslint/commit/0a59a86c))

### ❤️ Thank You

- Ofri Peretz

## [1.2.1] - 2026-02-02

This was a version bump only for eslint-plugin-lambda-security to align it with other projects, there were no code changes.

# Changelog

All notable changes to `eslint-plugin-lambda-security` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-29

### Added

#### Credential & Secrets Protection Rules (3)

- `no-hardcoded-credentials-sdk` - Detect hardcoded AWS credentials in SDK v3 clients (CWE-798)
- `no-secrets-in-env` - Detect secrets hardcoded in environment variables (CWE-798)
- `no-env-logging` - Detect logging entire process.env object (CWE-532)

#### CORS Security Rules (2)

- `no-permissive-cors-response` - Detect wildcard CORS in Lambda response headers (CWE-942)
- `no-permissive-cors-middy` - Detect permissive CORS in @middy/http-cors middleware (CWE-942)

#### Presets (2)

- `recommended` - Balanced security defaults
- `strict` - All 5 rules as errors

#### Features

- LLM-optimized error messages with CWE references
- OWASP Serverless Top 10 alignment (SAS-2, SAS-3, SAS-4)
- AWS SDK v3 client detection (S3, DynamoDB, Lambda, STS, etc.)
- Middy middleware detection (@middy/http-cors)
- Real AWS access key pattern matching (AKIA*, ASIA*)
- TypeScript support with exported option types
- Comprehensive test coverage (78 tests, 97.40% line coverage)
- Auto-fix for CORS violations

### Security

- Covers 3 CWEs: 532, 798, 942
- Maps to OWASP Serverless Top 10: SAS-2, SAS-3, SAS-4
