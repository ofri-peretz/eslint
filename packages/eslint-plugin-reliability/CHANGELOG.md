## [3.1.3] - 2026-05-03

## 3.1.4

### Patch Changes

- [#141](https://github.com/ofri-peretz/eslint/pull/141) [`38ab670`](https://github.com/ofri-peretz/eslint/commit/38ab670a0221684f4fd3d5dc3c05ddec7458ca2b) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - fix: remove false `meta.fixable: 'code'` declarations from 21 rules that had no `fix()` function

  Rules that declared `fixable: 'code'` in their ESLint meta without an actual `fix()` implementation would show the ⚡ auto-fix icon in editors and CI formatters but apply no change when `--fix` was run. This patch removes the misleading declaration from:
  - `browser-security/no-clickjacking`
  - `import-next/first`, `named`, `no-barrel-import`, `no-import-module-exports`, `no-namespace`
  - `node-security/no-buffer-overread`, `no-unsafe-dynamic-require`, `no-zip-slip`
  - `react-features/react-no-inline-functions`
  - `reliability/no-jsdoc-terminator-in-example` (uses `suggest`, not auto-fix; corrected to `hasSuggestions: true` only)
  - `secure-coding/no-directive-injection`, `no-electron-security-issues`, `no-graphql-injection`, `no-improper-sanitization`, `no-improper-type-validation`, `no-ldap-injection`, `no-unchecked-loop-condition`, `no-unlimited-resource-allocation`, `no-weak-password-recovery`, `no-xpath-injection`

- [#143](https://github.com/ofri-peretz/eslint/pull/143) [`213cde1`](https://github.com/ofri-peretz/eslint/commit/213cde190ff2aea49ca7c1b533170940f879d9b4) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - fix(no-missing-null-checks): eliminate 53 false positives via three new narrowing patterns

  Rules that were recognized as null guards are now correctly identified as safe:
  1. **Truthy if guard** — `if (obj) { obj.prop }` — direct truthy check proves non-null. Also covers chains: `if (response)` protects `response.data.items`.
  2. **Short-circuit AND** — `obj && obj.prop` — right side of `&&` only runs when left is truthy.
  3. **Ternary consequent** — `obj ? obj.prop : fallback` — truthy test guards the consequent.

  Also: bumped `beforeAll` timeout to 30 seconds in 7 compatibility test files (`__compatibility__/*.spec.ts`). Native-addon packages routinely exceed the previous 10-second default on a cold ESM load.

- Updated dependencies [[`736a5fe`](https://github.com/ofri-peretz/eslint/commit/736a5fed47e673f6157ea900b29fe2a54e4bc7df)]:
  - @interlace/eslint-devkit@1.4.1

### Bug Fixes

- `no-missing-null-checks`: exempt provably-non-null identifiers (built-in singletons like `Math`, `JSON`, `console`, error classes; catch-clause params; constructor results; top-level imports) from the null-check requirement. Eliminates a large class of false positives without weakening real coverage.
- `no-unhandled-promise`: refined detection (see source diff).

## 3.1.2 (2026-02-09)

This was a version bump only for eslint-plugin-reliability to align it with other projects, there were no code changes.

## [3.1.0] - 2026-02-08

This was a version bump only for eslint-plugin-reliability to align it with other projects, there were no code changes.

## [3.0.4] - 2026-02-08

### Bug Fixes

- align codecov component IDs with full package names ([2831b968](https://github.com/ofri-peretz/eslint/commit/2831b968))

### Documentation

- fix changelog header format across all packages ([c3a15082](https://github.com/ofri-peretz/eslint/commit/c3a15082))

### ❤️ Thank You

- Ofri Peretz

## [3.0.3] - 2026-02-06

### Bug Fixes

- align codecov component names and update docs components ([0a59a86c](https://github.com/ofri-peretz/eslint/commit/0a59a86c))

### ❤️ Thank You

- Ofri Peretz

## [3.0.2] - 2026-02-02

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
