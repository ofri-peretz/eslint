## [2.0.4] - 2026-02-08

## 2.1.1

### Patch Changes

- [#252](https://github.com/ofri-peretz/eslint/pull/252) [`d67e395`](https://github.com/ofri-peretz/eslint/commit/d67e3953c2748ad36e6aebe0f24b1d04e518b4d0) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix Codecov badge showing "unknown" — switch from flag to component URL format

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

This was a version bump only for eslint-plugin-modularity to align it with other projects, there were no code changes.

# Changelog

All notable changes to `eslint-plugin-modularity` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### Documentation

- 📘 Launched new documentation site: [eslint.interlace.tools](https://eslint.interlace.tools/)
- 📝 Achieved 100% documentation parity (both .md and .mdx files)

## [2.0.1] - 2026-02-02

This was a version bump only for eslint-plugin-modularity to align it with other projects, there were no code changes.

## [2.0.0] - 2026-02-02

This was a version bump only for eslint-plugin-modularity to align it with other projects, there were no code changes.

## [1.0.0] - 2026-01-26

### Added

- Initial stable release with 5 DDD architecture rules
- LLM-optimized error messages for AI-assisted development
- 100% test coverage across all rules
- ESLint 9 flat config support
- TypeScript type definitions for all rule options

### Rules

| Rule                             | Description                                    | 💼  | ⚠️  |
| :------------------------------- | :--------------------------------------------- | :-: | :-: |
| `ddd-anemic-domain-model`        | Detect anemic domain models lacking behavior   | 💼  | ⚠️  |
| `ddd-value-object-immutability`  | Enforce immutability in value objects          | 💼  |     |
| `enforce-naming`                 | Enforce consistent naming conventions by layer | 💼  | ⚠️  |
| `enforce-rest-conventions`       | Enforce RESTful naming in API controllers      | 💼  |     |
| `no-external-api-calls-in-utils` | Prevent external API calls in utility modules  | 💼  |     |

### Presets

- `recommended` - Balanced DDD and architecture enforcement
- `strict` - All rules as errors for strict enforcement

### Fixed (Jan 2026 Remediation)

- **`enforce-naming`**: Implemented `preserveCase` pattern to preserve original casing in suggestions
  - Example: `UserService` → `CustomerService` (not `customerservice`)
- **`ddd-value-object-immutability`**: Added `mutableNestedType` detection
  - Now detects `readonly items: Item[]` where `Item` has mutable properties
- **`ddd-anemic-domain-model`**: Implemented `isPureDelegation` detection
  - Methods that only delegate to external services no longer count as business logic
  - Excludes built-in array methods (`reduce`, `map`, `filter`) appearing as delegation
  - Excludes JS prototypes (`toString`, `valueOf`) on own properties

### Known Limitations

Documented in `docs/KNOWN-LIMITATIONS.md`:

- `ddd-anemic-domain-model`: Logic hidden in base classes outside the current file not detected
- `ddd-value-object-immutability`: Complex object hierarchies from external factories may bypass checks
- `no-external-api-calls-in-utils`: API calls via DI clients or generic wrappers not detected
- Circular dependencies via DI or dynamic `require()` not mapped
