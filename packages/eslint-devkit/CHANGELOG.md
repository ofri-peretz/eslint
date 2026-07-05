## [1.4.0] - 2026-05-03

## 1.4.1

### Patch Changes

- [#155](https://github.com/ofri-peretz/eslint/pull/155) [`736a5fe`](https://github.com/ofri-peretz/eslint/commit/736a5fed47e673f6157ea900b29fe2a54e4bc7df) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix `patternToRegex` (glob→regex) to escape **all** regex metacharacters, not just `.`. The previous chained `.replace()` left `\ + ( ) | [ ] { } ^ $` to leak through as regex syntax, so an ignore glob such as `a+b` or `(x)` compiled to a quantifier / capture group and matched the wrong files (CWE-116, surfaced by CodeQL `js/incomplete-sanitization`). The wildcard translation (`**`, `*`, `?`) is unchanged; a regression-lock test pins the metacharacter behavior.

### Changed

- Module resolver swapped from `enhanced-resolve` + `get-tsconfig` to [`oxc-resolver`](https://www.npmjs.com/package/oxc-resolver) (Rust NAPI, ~18-30× faster). Per-tsconfig caching for monorepo path-alias correctness across package boundaries.
- `peerDependenciesMeta` no longer lists `enhanced-resolve` and `get-tsconfig` (consumers don't need to peer-provide them; this is **technically breaking** but no consumer impact is expected).

### Added

- `oxc-resolver` is now a hard `dependencies` entry. Note for adopters: NAPI prebuilds cover common targets (Linux x64/arm64 glibc + musl, macOS x64/arm64, Windows x64); rare targets may need to fall back to a build step.

## [1.3.3] - 2026-02-08

This was a version bump only for eslint-devkit to align it with other projects, there were no code changes.

## [1.3.2] - 2026-02-06

This was a version bump only for eslint-devkit to align it with other projects, there were no code changes.

# Changelog

All notable changes to `@interlace/eslint-devkit` are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and [SemVer](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-30

### 🚀 Features

- Enhanced LLM message formatting utilities.
- Improved TypeScript typings for IDE support.

### 🩹 Fixes

- Compatibility fixes for TS strict mode.
- More accurate type guards for AST checking.

### 📌 Notes

- Package name aligned to `@interlace/eslint-devkit` (formerly eslint-plugin-utils).

### ❤️ Thank You

- Ofri Peretz

---

## [0.3.0] - 2025-11-15

### 🚀 Features

- Enhanced type utilities.
- Improved AST helpers.
- Better LLM-oriented error messaging.

### 🩹 Fixes

- Type checking edge cases.
- Documentation improvements.

### ❤️ Thank You

- Ofri Peretz

---

## [0.2.2] - 2025-11-07

### 🩹 Fixes

- Config fixes; removed codecov vite plugin.
- Adjusted ignore patterns in dependency checks.
- Added vitest to peerDependencies.

### ❤️ Thank You

- Ofri Peretz

---

## [0.2.1] - 2025-11-07

### 🩹 Fixes

- Config and dependency-check adjustments.

### ❤️ Thank You

- Ofri Peretz

---

## [0.2.0] - 2025-11-02

Version bump to align packages; no code changes.

---

## [0.1.1] - 2025-11-02

Version bump to align packages; no code changes.

---

## [0.1.0] - 2025-11-02

Initial prerelease for the devkit utilities.
