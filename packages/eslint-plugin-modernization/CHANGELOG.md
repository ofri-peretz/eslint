# Changelog

All notable changes to `eslint-plugin-modernization` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Documentation

- 📘 Launched new documentation site: [eslint.interlace.tools](https://eslint.interlace.tools/)
- 📝 Achieved 100% documentation parity (both .md and .mdx files)

## [1.0.0] - 2026-01-26

### Added

- Initial stable release with 3 modernization rules
- LLM-optimized error messages for AI-assisted development
- 100% test coverage across all rules
- ESLint 9 flat config support
- TypeScript type definitions for all rule options

### Rules

| Rule                  | Description                                              | 💼  | ⚠️  |
| :-------------------- | :------------------------------------------------------- | :-: | :-: |
| `no-instanceof-array` | Prefer `Array.isArray()` over `instanceof Array`         | 💼  |     |
| `prefer-at`           | Prefer `Array.at()` for negative index access (ES2022+)  | 💼  | ⚠️  |
| `prefer-event-target` | Prefer `EventTarget` over `EventEmitter` in browser code | 💼  | ⚠️  |

### Presets

- `recommended` - Balanced modernization for most projects
- `strict` - All rules as errors for aggressive modernization

### Why These Rules?

#### `no-instanceof-array`

`instanceof Array` fails across different realms (iframes, workers). `Array.isArray()` is the correct, reliable check.

#### `prefer-at`

`Array.at()` provides cleaner negative index access and is part of ES2022. This rule helps migrate legacy `arr[arr.length - 1]` patterns.

#### `prefer-event-target`

`EventTarget` is the native browser API and doesn't require Node.js polyfills like `EventEmitter`. This rule helps migrate browser code to use native APIs.

### Migration Path

These rules are designed for incremental adoption:

1. Start with `recommended` preset (warnings)
2. Fix violations as warnings appear
3. Graduate to `strict` preset when ready
