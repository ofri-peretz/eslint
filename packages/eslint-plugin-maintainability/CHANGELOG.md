## 3.0.1 (2026-02-02)

This was a version bump only for eslint-plugin-maintainability to align it with other projects, there were no code changes.

# Changelog

All notable changes to `@interlace/eslint-plugin-maintainability` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### Documentation

- 📘 Launched new documentation site: [eslint.interlace.tools](https://eslint.interlace.tools/)
- 📝 Achieved 100% documentation parity (both .md and .mdx files)

## [3.0.0] - 2026-02-02

This was a version bump only for eslint-plugin-maintainability to align it with other projects, there were no code changes.

## [1.0.0] - 2026-01-26

### Added

- Initial stable release with 12 maintainability rules
- LLM-optimized error messages for AI-assisted development
- 100% test coverage across all rules
- ESLint 9 flat config support
- TypeScript type definitions for all rule options

### Rules

#### Complexity Rules

| Rule                        | Description                      |
| :-------------------------- | :------------------------------- |
| `max-cognitive-complexity`  | Limit cognitive complexity score |
| `max-cyclomatic-complexity` | Limit cyclomatic complexity      |
| `max-depth`                 | Limit nesting depth              |
| `max-lines`                 | Limit file length                |
| `max-lines-per-function`    | Limit function length            |
| `max-params`                | Limit function parameters        |

#### Code Smell Rules

| Rule                       | Description                         |
| :------------------------- | :---------------------------------- |
| `no-magic-numbers`         | Disallow magic numbers              |
| `no-nested-ternary`        | Disallow nested ternary expressions |
| `no-deep-callback-nesting` | Disallow deeply nested callbacks    |
| `no-long-parameter-list`   | Disallow long parameter lists       |

#### Clean Code Rules

| Rule                  | Description                                 |
| :-------------------- | :------------------------------------------ |
| `prefer-early-return` | Prefer early returns over nested conditions |
| `no-duplicate-logic`  | Detect duplicated logic blocks (DRY)        |

### Presets

- `recommended` - Balanced maintainability thresholds

### SOLID Principles Mapping

Rules are annotated with SOLID principle alignment:

- Single Responsibility: `max-lines-per-function`, `max-lines`
- Open/Closed: `prefer-early-return`
