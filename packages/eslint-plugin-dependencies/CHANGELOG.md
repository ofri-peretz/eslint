# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
  - `no-circular-dependencies` - Detect circular dependency chains
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

