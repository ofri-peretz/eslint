## [3.0.3] - 2026-02-08

## 3.0.7

### Patch Changes

- [#252](https://github.com/ofri-peretz/eslint/pull/252) [`d67e395`](https://github.com/ofri-peretz/eslint/commit/d67e3953c2748ad36e6aebe0f24b1d04e518b4d0) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix Codecov badge showing "unknown" — switch from flag to component URL format

## 3.0.6

### Patch Changes

- [#225](https://github.com/ofri-peretz/eslint/pull/225) [`34ff5a8`](https://github.com/ofri-peretz/eslint/commit/34ff5a8e6f5126c5d1c0a524759e0af2b5476b46) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - CI-only: pin all coverage thresholds at 100% (integration target, merges last).

## 3.0.5

### Patch Changes

- [#200](https://github.com/ofri-peretz/eslint/pull/200) [`02e0baf`](https://github.com/ofri-peretz/eslint/commit/02e0baf7a4e8ba83e8b2ec2b82169f733e4f4d87) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - fix: republish `recommended` preset with the correct plugin namespace

  The published builds of `eslint-plugin-maintainability` and
  `eslint-plugin-operability` shipped a `recommended` config whose plugin KEY
  (`@interlace/maintainability`) did not match its rule PREFIX
  (`@interlace/maintainability/maintainability/…` — doubled). ESLint cannot
  resolve that, so spreading `...configs.recommended` throws
  "could not find plugin" the moment a consumer lints a file — under both
  ESLint 9 and 10.

  The source was corrected in the 2026-05-16 namespace cleanup (alongside
  `react-features`, which has since been republished via other changesets), but
  these two plugins were never bumped — so npm still serves the broken builds and
  they are the only two doubled-namespace plugins still unfixed downstream. This
  republishes them from the corrected source.

  Regression lock: `packages/eslint-config-interlace/src/ecosystem-integrity.test.ts`
  loads every plugin's every config preset into a real ESLint instance and fails
  if any rule→plugin reference cannot be resolved. Run it against the built
  `dist/` in the release pipeline (pre-publish) to also catch a stale-artifact
  publish — the failure mode that let these two ship broken.

## 3.0.4

### Patch Changes

- [#197](https://github.com/ofri-peretz/eslint/pull/197) [`ecb8491`](https://github.com/ofri-peretz/eslint/commit/ecb849121833bf63b00256fa837f329bb721fbac) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - fix: republish `recommended` with correctly-namespaced, unscoped rule ids

  `eslint-plugin-maintainability@3.0.3` and `eslint-plugin-operability@3.0.5`
  shipped a `recommended` preset whose rule ids carried a doubled, scoped plugin
  segment (`@interlace/maintainability/maintainability/cognitive-complexity`)
  that no registered plugin key matched. Enabling the preset alongside any other
  config made ESLint throw at load:

  ```text
  Could not find plugin "@interlace/maintainability/maintainability".
  ```

  (and the equivalent `@interlace/operability/operability` for operability.)

  The source was already corrected to the bare, unscoped form
  (`maintainability/cognitive-complexity` under a `maintainability` plugin key)
  but was never republished, so npm still served the broken build. This release
  ships the corrected build. `plugin.meta.name` is also fixed to the unscoped
  `eslint-plugin-maintainability` (was `@interlace/eslint-plugin-maintainability`,
  which drifted from the package name and every other plugin).

  Each plugin is configured on its own — there is no unified config. No rule
  behaviour changes.

  New regression locks in each plugin's `index.test.ts` reproduce ESLint's rule-id
  resolution, pin the plugin name and key as unscoped, and load each `recommended`
  preset in a real ESLint instance — failing closed if a scoped or doubly
  namespaced config could ship again.

### Bug Fixes

- align codecov component IDs with full package names ([2831b968](https://github.com/ofri-peretz/eslint/commit/2831b968))

### Documentation

- fix changelog header format across all packages ([c3a15082](https://github.com/ofri-peretz/eslint/commit/c3a15082))

### ❤️ Thank You

- Ofri Peretz

## [3.0.2] - 2026-02-06

### Bug Fixes

- align codecov component names and update docs components ([0a59a86c](https://github.com/ofri-peretz/eslint/commit/0a59a86c))

### ❤️ Thank You

- Ofri Peretz

## [3.0.1] - 2026-02-02

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
