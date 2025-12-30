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
