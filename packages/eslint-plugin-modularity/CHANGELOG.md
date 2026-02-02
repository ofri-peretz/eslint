## 2.0.2 (2026-02-02)

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
