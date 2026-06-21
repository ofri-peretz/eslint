## [3.0.3] - 2026-02-08

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
