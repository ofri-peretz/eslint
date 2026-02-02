## 2.3.1 (2026-02-02)

This was a version bump only for eslint-plugin-import-next to align it with other projects, there were no code changes.

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### Documentation

- 📘 Launched new documentation site: [eslint.interlace.tools](https://eslint.interlace.tools/)

## [2.0.0] - 2025-12-30

### Changed

- **Architecture Overhaul**: Complete rewrite for performance and maintainability.
- **Rule Parity**: Achieved 100% feature parity with `eslint-plugin-import` (46 rules).
- **Performance**: `no-cycle` rule is now up to 100x faster using incremental graph analysis.
- **TypeScript Support**: First-class support for TypeScript (parsers and resolvers) out of the box.

### Added

- **New Rules**:
  - `prefer-node-protocol` - Enforce `node:` protocol for Node.js built-ins.
  - `no-named-as-default` - specialized check for named exports used as default.
  - `no-named-as-default-member` - Check for properties on default export that match named exports.
  - `no-relative-packages` - Enforce package boundaries.
  - `no-import-module-exports` - Disallow `module.exports` alongside imports.
  - `no-empty-named-blocks` - Disallow empty named import blocks.
  - `consistent-type-specifier-style` - Enforce type-only import style (inline vs top-level).
  - `no-dynamic-require` - Disallow dynamic require calls.
  - `no-self-import` - Detect self-referential imports.
  - `no-named-default` - Disallow named default exports.
  - `no-restricted-paths` - Enhanced path restriction rule.
  - `unambiguous` - Enforce unambiguous module type.
- **Enhanced Documentation**: All rules now feature AEO-compliant documentation with OWASP mappings.
- **Improved Testing**: Comprehensive test suite covering all rules, including edge cases and TypeScript integration.

## [1.0.0] - 2024-12-05

### Added

- Initial release with 30 LLM-optimized dependency rules
- **Module Resolution Rules** (7 rules):
  - `no-unresolved` - Ensure imports resolve to a module
  - `named` - Ensure named imports exist
  - `default` - Ensure default export exists
  - `namespace` - Ensure namespace imports are valid
  - `extensions` - Enforce file extension usage
  - `no-self-import` - Prevent module from importing itself
  - `no-duplicates` - Prevent duplicate imports
- **Module System Rules** (3 rules):
  - `no-amd` - Disallow AMD imports
  - `no-commonjs` - Disallow CommonJS imports
  - `no-nodejs-modules` - Disallow Node.js built-in modules
- **Dependency Boundaries Rules** (6 rules):
  - `no-cycle` - Detect circular dependency chains
  - `no-internal-modules` - Forbid deep/internal module imports
  - `no-cross-domain-imports` - Enforce domain boundaries
  - `enforce-dependency-direction` - Enforce layered architecture
  - `no-restricted-paths` - Restrict imports between paths
  - `no-relative-parent-imports` - Disallow `../` imports
- **Export Style Rules** (6 rules):
  - `no-default-export` - Disallow default exports
  - `no-named-export` - Disallow named exports
  - `prefer-default-export` - Prefer default for single exports
  - `no-anonymous-default-export` - Disallow anonymous default exports
  - `no-mutable-exports` - Disallow mutable exports
  - `no-deprecated` - Disallow deprecated exports
- **Import Style Rules** (4 rules):
  - `enforce-import-order` - Enforce import ordering
  - `first` - Ensure imports are at the top
  - `newline-after-import` - Require newline after imports
  - `no-unassigned-import` - Disallow side-effect imports
- **Dependency Management Rules** (4 rules):
  - `no-extraneous-dependencies` - Disallow unlisted dependencies
  - `no-unused-modules` - Detect unused exports/modules
  - `max-dependencies` - Limit number of dependencies
  - `prefer-node-protocol` - Prefer `node:` protocol for builtins
- Preset configurations: `recommended`, `strict`, `module-resolution`, `import-style`, `esm`, `architecture`
- Full ESLint 9 flat config support
- ESLint MCP integration for AI assistants
- TypeScript type exports for all rule options
