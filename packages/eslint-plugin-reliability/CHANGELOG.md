## 3.0.2 (2026-02-02)

This was a version bump only for eslint-plugin-reliability to align it with other projects, there were no code changes.

# Changelog

All notable changes to `eslint-plugin-reliability` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### Documentation

- 📘 Launched new documentation site: [eslint.interlace.tools](https://eslint.interlace.tools/)
- 📝 Achieved 100% documentation parity (both .md and .mdx files)

## [3.0.1] - 2026-02-02

This was a version bump only for eslint-plugin-reliability to align it with other projects, there were no code changes.

## [3.0.0] - 2026-02-02

This was a version bump only for eslint-plugin-reliability to align it with other projects, there were no code changes.

## [1.0.0] - 2026-01-26

### Added

- Initial stable release with 8 reliability rules
- LLM-optimized error messages for AI-assisted development
- 100% test coverage across all rules
- ESLint 9 flat config support
- TypeScript type definitions for all rule options

### Rules

#### Error Handling (4 rules)

| Rule                       | Description                                   | CWE     |
| :------------------------- | :-------------------------------------------- | :------ |
| `no-unhandled-promise`     | Detect unhandled promise rejections           | CWE-392 |
| `no-silent-errors`         | Detect empty catch blocks that swallow errors | CWE-390 |
| `no-missing-error-context` | Require error context when re-throwing        | CWE-209 |
| `error-message`            | Require meaningful error messages             | CWE-209 |

#### Runtime Safety (4 rules)

| Rule                       | Description                                   | CWE         |
| :------------------------- | :-------------------------------------------- | :---------- |
| `no-missing-null-checks`   | Detect potential null/undefined dereferences  | CWE-476     |
| `no-unsafe-type-narrowing` | Detect unsafe type narrowing patterns         | CWE-704     |
| `require-network-timeout`  | Require timeouts on network requests          | CWE-400     |
| `no-await-in-loop`         | Detect sequential await in loops (N+1 issues) | Performance |

### Presets

- `recommended` - Balanced reliability checks (4 rules as warnings)

### Known Limitations

Documented in `docs/KNOWN-LIMITATIONS.md`:

- `no-unhandled-promises`: Promises in callbacks or async iterators may be missed
- `no-silent-errors`: Intentional suppression vs. actual swallowing is hard to distinguish
- `no-missing-null-checks`: Business-logic guarantees not in types can trigger false positives
