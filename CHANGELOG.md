# Changelog

All notable changes to forge-js packages will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.3-rc.20] - 2025-01-16

### Added - @forge-js/eslint-plugin-llm-optimized

- Added comprehensive test suite for security rules (`detect-child-process.test.ts`, `detect-eval-with-expression.test.ts`)
- Enhanced test coverage for command injection and code injection detection
- LLM-optimized context generation for security violations

### Fixed - @forge-js/eslint-plugin-llm-optimized

- **BREAKING**: Fixed implicit `any` type errors in callback parameters (lines 194, 213, 218 in `detect-child-process.ts`)
  - Added explicit type annotations: `(el: TSESTree.Node | null)`, `(arg: TSESTree.Node)`
- Fixed type mismatch on line 308: severity mapping now correctly converts risk levels to LLMContext severity types
  - Maps `'critical'` → `'error'`, `'high'` → `'warning'`, `'medium'` → `'info'`
- Removed unused `node` parameter from `checkChildProcessImport` function

### Dependencies - @forge-js/eslint-plugin-utils

- Updated to 0.0.3-rc.8

## [0.0.3-rc.19] - 2025-01-15

### Added - @forge-js/eslint-plugin-llm-optimized

- New security rule: `detect-child-process` - detects command injection vulnerabilities
- New security rule: `detect-eval-with-expression` - detects code injection via eval/Function constructor
- LLM-optimized error messages with comprehensive remediation guidance

### Changed - @forge-js/eslint-plugin-llm-optimized

- Enhanced message formatting for accessibility and WCAG compliance
- Improved risk level classification system (critical/high/medium)

## [0.0.3-rc.18] - 2025-01-14

### Added - @forge-js/eslint-plugin-llm-optimized

- Type safety improvements for rule implementations
- Better error handling in security rules

### Dependencies - @forge-js/eslint-plugin-utils

- Updated to 0.0.3-rc.6

## [0.0.3-rc.8] - 2025-01-16

### Added - @forge-js/eslint-plugin-utils

- Type utilities for rule creation
- Enhanced AST utilities for node analysis

## [0.0.3-rc.7] - 2025-01-15

### Added - @forge-js/eslint-plugin-utils

- Rule creator utilities
- LLM context generation helpers

## [0.0.3-rc.6] - 2025-01-14

### Added - @forge-js/eslint-plugin-utils

- Initial utilities library for ESLint plugins
- AST manipulation helpers
- Type system utilities

## Project Structure

### @forge-js/eslint-plugin-llm-optimized

LLM-optimized ESLint plugin with comprehensive security and code quality rules.

**Status**: Pre-release (rc) - Actively developed
**Key Features**:
- Security rules (command injection, code injection, SQL injection, etc.)
- Code quality rules (complexity, naming conventions, duplication)
- Architecture rules (circular dependencies, module boundaries)
- React-specific rules (hooks conversion, performance)
- Accessibility rules (alt text, required attributes)

**Latest Version**: 0.0.3-rc.20

### @forge-js/eslint-plugin-utils

Utilities library for creating TypeScript ESLint plugins.

**Status**: Pre-release (rc)
**Key Features**:
- Rule creator utilities
- AST utilities
- Type utilities
- LLM context generation

**Latest Version**: 0.0.3-rc.8

### @forge-js/cli

CLI tool for managing releases in the forge-js monorepo.

**Status**: Development
**Features**:
- Release management (versioning, tagging)
- Publishing to npm
- Pre-release management (alpha, beta, rc, canary)

## Installation

```bash
# Install the main ESLint plugin
npm install --save-dev @forge-js/eslint-plugin-llm-optimized

# Install utilities for plugin development
npm install @forge-js/eslint-plugin-utils
```

## Usage

### ESLint Configuration

```javascript
// eslint.config.js
import forgePlugin from '@forge-js/eslint-plugin-llm-optimized';

export default [
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      '@forge-js': forgePlugin,
    },
    rules: {
      '@forge-js/detect-child-process': 'error',
      '@forge-js/detect-eval-with-expression': 'error',
    },
  },
];
```

## Release Process

Releases are managed through Nx's built-in release system:

```bash
# Create changelog and version bump
nx release version

# Publish to npm
nx release publish

# Or do both
nx release
```

## Contributing

Please see [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for guidelines.

## License

MIT - See [LICENSE](./LICENSE) file for details

## Links

- **GitHub**: https://github.com/ofri-peretz/forge-js
- **NPM**: https://www.npmjs.com/org/forge-js
- **Documentation**: https://github.com/ofri-peretz/forge-js#readme

---

## Version History

### Pre-release Versions (rc)

All 0.0.3-rc.* versions are pre-release and subject to breaking changes.

When moving to 0.0.3 stable:
- All current rc.* functionality will be included
- Breaking changes will be documented
- Stable API will be guaranteed through patch versions

### Roadmap to 1.0.0

- ✅ Core security rules implementation
- ✅ Code quality and architecture rules
- ✅ React-specific rules
- ⏳ Performance optimization
- ⏳ Extended rule coverage
- ⏳ Stable API (1.0.0)
