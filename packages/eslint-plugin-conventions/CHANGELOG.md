## 4.0.4 (2026-02-08)

### Bug Fixes

- align codecov component IDs with full package names ([2831b968](https://github.com/ofri-peretz/eslint/commit/2831b968))

### Documentation

- fix changelog header format across all packages ([c3a15082](https://github.com/ofri-peretz/eslint/commit/c3a15082))

### ❤️ Thank You

- Ofri Peretz

## [4.0.3] - 2026-02-06

### Bug Fixes

- align codecov component names and update docs components ([0a59a86c](https://github.com/ofri-peretz/eslint/commit/0a59a86c))

### ❤️ Thank You

- Ofri Peretz

## [4.0.2] - 2026-02-02

This was a version bump only for eslint-plugin-conventions to align it with other projects, there were no code changes.

# Changelog

All notable changes to `eslint-plugin-conventions` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### Documentation

- 📘 Launched new documentation site: [eslint.interlace.tools](https://eslint.interlace.tools/)
- 📝 Achieved 100% documentation parity (both .md and .mdx files)

## [4.0.1] - 2026-02-02

This was a version bump only for eslint-plugin-conventions to align it with other projects, there were no code changes.

## [4.0.0] - 2026-02-02

This was a version bump only for eslint-plugin-conventions to align it with other projects, there were no code changes.

## [3.0.0] - 2026-02-02

This was a version bump only for eslint-plugin-conventions to align it with other projects, there were no code changes.

## [1.0.0] - 2026-01-26

### Added

- Initial stable release with 9 convention rules
- LLM-optimized error messages for AI-assisted development
- 100% test coverage across all rules
- ESLint 9 flat config support
- TypeScript type definitions for all rule options

### Rules

| Rule                                 | Description                                           | 💼  | ⚠️  |
| :----------------------------------- | :---------------------------------------------------- | :-: | :-: |
| `no-commented-code`                  | Disallow commented-out code blocks                    | 💼  | ⚠️  |
| `expiring-todo-comments`             | Enforce expiration dates on TODO comments             | 💼  | ⚠️  |
| `prefer-code-point`                  | Prefer `codePointAt` over `charCodeAt` for Unicode    |     |     |
| `prefer-dom-node-text-content`       | Prefer `textContent` over `innerText` for performance |     |     |
| `no-console-spaces`                  | Disallow leading/trailing spaces in console calls     |     |     |
| `no-deprecated-api`                  | Disallow usage of deprecated Node.js APIs             | 💼  | ⚠️  |
| `prefer-dependency-version-strategy` | Enforce consistent version strategies                 |     |     |
| `filename-case`                      | Enforce consistent file naming conventions            |     |     |
| `consistent-existence-index-check`   | Enforce consistent array index existence checks       |     |     |

### Presets

- `recommended` - Balanced conventions for most teams

### Known Limitations

Documented in `docs/KNOWN-LIMITATIONS.md`:

- `filename-case`: Framework-required names (e.g., `webpack.config.js`) require manual exclude lists
- `no-deprecated-api`: May not detect usage through wrapper libraries
- `expiring-todo-comments`: Requires consistent date formats (ISO 8601 recommended)
