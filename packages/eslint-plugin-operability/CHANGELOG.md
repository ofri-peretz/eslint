# Changelog

All notable changes to `eslint-plugin-operability` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Documentation

- 📘 Launched new documentation site: [eslint.interlace.tools](https://eslint.interlace.tools/)
- 📝 Achieved 100% documentation parity (both .md and .mdx files)

## [1.0.0] - 2026-01-26

### Added

- Initial stable release with 6 production-readiness rules
- LLM-optimized error messages for AI-assisted development
- 100% test coverage across all rules
- ESLint 9 flat config support
- TypeScript type definitions for all rule options

### Rules

| Rule                          | Description                                      | 💼  | ⚠️  |
| :---------------------------- | :----------------------------------------------- | :-: | :-: |
| `no-console-log`              | Disallow `console.log` in production code        | 💼  | ⚠️  |
| `no-process-exit`             | Disallow `process.exit()` in library code        |     |     |
| `no-debug-code-in-production` | Detect `debugger` statements and debug keywords  | 💼  |     |
| `no-verbose-error-messages`   | Prevent overly detailed error messages (CWE-209) | 💼  | ⚠️  |
| `require-code-minification`   | Detect patterns that prevent minification        |     |     |
| `require-data-minimization`   | Detect excessive data exposure in responses      |     |     |

### Presets

- `recommended` - Balanced operability checks for production code

### Security

- `no-verbose-error-messages` prevents information exposure (CWE-209)
- `require-data-minimization` enforces data protection principles

### Jan 2026 Remediation

- Converted skeleton documentation to high-fidelity guides
- Added comprehensive examples for all rules
- Documented known limitations in `docs/KNOWN-LIMITATIONS.md`
