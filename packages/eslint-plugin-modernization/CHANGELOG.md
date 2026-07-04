## [2.0.4] - 2026-02-08

## 2.1.0

### Minor Changes

- [#148](https://github.com/ofri-peretz/eslint/pull/148) [`82718c2`](https://github.com/ofri-peretz/eslint/commit/82718c282895710d42c36d4679fb24d47f1c35c7) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - feat+fix: ILB-Wild FP reduction + two new quality rules

  **`no-unsafe-deserialization` FP reduction (~112 FPs)**
  - Track `fs.readFileSync('literal')` calls in `literalPathFileVars` — a file read with a
    hardcoded path (bundled config) is not user-controlled input for safe deserializers
    (`JSON.parse`, schema-validating parsers). `eval()` still fires even on literal-path reads.

  **`no-buffer-overread` FP reduction (~129 FPs)**
  - Remove `b` (single-char, too broad) and `chunk` (too common for array chunks) from the
    Buffer alias heuristic — `isBufferType` now only matches `buf` and `bytes` by name,
    reducing false matches on non-Buffer variables.

  **New rule: `modernization/prefer-template-literal`**
  - Flags `"string " + variable` concatenation and suggests the equivalent template literal.
  - Auto-fix produces the correct `` `string ${variable}` `` replacement.
  - Pure string literal chains (`"a" + "b"`) and numeric addition are not flagged.
  - Closes P2 quality FN `prob_string_concat` in the ILB-Arena-Quality bench.

  **New rule: `modularity/no-mutable-exports`**
  - Flags `export let` and `export var` — module exports should be immutable `const`
    bindings so all importers share a stable reference.
  - Auto-fix replaces `let`/`var` with `const`.
  - Closes P2 quality FN `prob_mutable_export` in the ILB-Arena-Quality bench.

### Patch Changes

- Updated dependencies [[`736a5fe`](https://github.com/ofri-peretz/eslint/commit/736a5fed47e673f6157ea900b29fe2a54e4bc7df)]:
  - @interlace/eslint-devkit@1.4.1

### Bug Fixes

- align codecov component IDs with full package names ([2831b968](https://github.com/ofri-peretz/eslint/commit/2831b968))

### Documentation

- fix changelog header format across all packages ([c3a15082](https://github.com/ofri-peretz/eslint/commit/c3a15082))

### ❤️ Thank You

- Ofri Peretz

## [2.0.3] - 2026-02-06

### Bug Fixes

- align codecov component names and update docs components ([0a59a86c](https://github.com/ofri-peretz/eslint/commit/0a59a86c))

### ❤️ Thank You

- Ofri Peretz

## [2.0.2] - 2026-02-02

This was a version bump only for eslint-plugin-modernization to align it with other projects, there were no code changes.

# Changelog

All notable changes to `eslint-plugin-modernization` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### Documentation

- 📘 Launched new documentation site: [eslint.interlace.tools](https://eslint.interlace.tools/)
- 📝 Achieved 100% documentation parity (both .md and .mdx files)

## [2.0.1] - 2026-02-02

This was a version bump only for eslint-plugin-modernization to align it with other projects, there were no code changes.

## [2.0.0] - 2026-02-02

This was a version bump only for eslint-plugin-modernization to align it with other projects, there were no code changes.

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
