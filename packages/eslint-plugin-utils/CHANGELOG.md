# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] - 2025-11-15

### 🩹 Fixes

- **LICENSE file inclusion**: LICENSE file now properly included in package distribution

### ❤️ Thank You

- Ofri Peretz

---

## [1.0.1] - 2025-11-15

### 📚 Documentation

- **Added LICENSE file**: MIT License included in package distribution
- **Enhanced README.md**: LLM-optimized README with comprehensive API documentation, examples, and best practices
- **Complete CHANGELOG.md**: Full changelog following Keep a Changelog format with version history

### 🎯 Improvements

- Better discoverability with enhanced README structure
- Clear API reference tables for all utilities
- Step-by-step quick start guide
- Comprehensive examples for each utility category
- Best practices section for LLM-optimized rule development

### ❤️ Thank You

- Ofri Peretz

---

## [1.0.0] - 2025-11-15

### 🎉 Major Release

This is the first stable major release of `@forge-js/eslint-plugin-utils`, marking the package as production-ready with a stable API.

### ✨ Features

- **Stable API**: All core utilities are now stable and ready for production use
- **TypeScript Support**: Full TypeScript support with comprehensive type definitions
- **LLM-Optimized**: Error messages and utilities designed for AI assistant compatibility
- **AST Utilities**: Comprehensive set of AST traversal and analysis helpers
- **Type Utilities**: Type-aware analysis using TypeScript compiler API

### 📚 Documentation

- Complete API documentation with examples
- LLM-optimized README with clear usage patterns
- Type definitions for all utilities

### 🔧 Core Utilities

#### Rule Creation

- `createRule()` - Create well-typed ESLint rules
- `createRuleCreator()` - Custom rule factory with documentation URL patterns

#### AST Utilities

- `isNodeOfType()` - Type guard for AST nodes
- `isFunctionNode()` - Check if node is any function type
- `isClassNode()` - Check if node is a class
- `isMemberExpression()` - Match patterns like `console.log`
- `isCallExpression()` - Check function call by name
- `getIdentifierName()` - Extract identifier name
- `getFunctionName()` - Get function name
- `isInsideNode()` - Check if inside specific parent
- `getAncestorOfType()` - Find first ancestor of type
- `isLiteral()` - Check if literal value
- `isTemplateLiteral()` - Check if template literal
- `getStaticValue()` - Extract static value

#### Type Utilities

- `hasParserServices()` - Check if type info available
- `getParserServices()` - Get parser services
- `getTypeOfNode()` - Get TypeScript type of node
- `isStringType()` - Check if type is string
- `isNumberType()` - Check if type is number
- `isBooleanType()` - Check if type is boolean
- `isArrayType()` - Check if type is array
- `isPromiseType()` - Check if type is Promise
- `isAnyType()` - Check if type is any
- `isUnknownType()` - Check if type is unknown
- `isNullableType()` - Check if type is nullable
- `getTypeArguments()` - Get generic type arguments

### 🔗 Dependencies

- `@typescript-eslint/utils`: ^8.46.2
- `tslib`: ^2.3.0

### 📦 Compatibility

- ESLint: ^8.0.0 || ^9.0.0
- TypeScript: >=4.0.0
- Node.js: >=18.0.0

### ❤️ Thank You

- Ofri Peretz

---

## [0.3.0] - 2025-11-15

### 🚀 Features

- Enhanced type utilities for better TypeScript integration
- Improved AST helper functions
- Better error messages for LLM optimization

### 🩹 Fixes

- Fixed type checking edge cases
- Improved documentation

### ❤️ Thank You

- Ofri Peretz

---

## [0.2.2] - 2025-11-07

### 🩹 Fixes

- Fixed configs
- Dropped codecov vite plugin
- Fixed ignore patterns in dependency-checks
- Added vitest to peerDependencies

### ❤️ Thank You

- Ofri Peretz

---

## [0.2.1] - 2025-11-07

### 🩹 Fixes

- configs ([55925e4](https://github.com/ofri-peretz/forge-js/commit/55925e4))
- drop codecov vite plugin ([4b1ae7e](https://github.com/ofri-peretz/forge-js/commit/4b1ae7e))
- ignore vitest.config in eslint-plugin-utils dependency-checks ([2f20c14](https://github.com/ofri-peretz/forge-js/commit/2f20c14))
- add vitest to peerDependencies in eslint-plugin-utils ([cee01b5](https://github.com/ofri-peretz/forge-js/commit/cee01b5))

### ❤️ Thank You

- Ofri Peretz

---

## [0.2.0] - 2025-11-02

This was a version bump only for eslint-plugin-utils to align it with other projects, there were no code changes.

---

## [0.1.1] - 2025-11-02

This was a version bump only for eslint-plugin-utils to align it with other projects, there were no code changes.

---

## [0.1.0] - 2025-11-02

This was a version bump only for eslint-plugin-utils to align it with other projects, there were no code changes.

---

[1.0.2]: https://github.com/ofri-peretz/forge-js/compare/eslint-plugin-utils@1.0.1...eslint-plugin-utils@1.0.2
[1.0.1]: https://github.com/ofri-peretz/forge-js/compare/eslint-plugin-utils@1.0.0...eslint-plugin-utils@1.0.1
[1.0.0]: https://github.com/ofri-peretz/forge-js/compare/eslint-plugin-utils@0.3.0...eslint-plugin-utils@1.0.0
[0.3.0]: https://github.com/ofri-peretz/forge-js/compare/eslint-plugin-utils@0.2.2...eslint-plugin-utils@0.3.0
[0.2.2]: https://github.com/ofri-peretz/forge-js/compare/eslint-plugin-utils@0.2.1...eslint-plugin-utils@0.2.2
[0.2.1]: https://github.com/ofri-peretz/forge-js/compare/eslint-plugin-utils@0.2.0...eslint-plugin-utils@0.2.1
[0.2.0]: https://github.com/ofri-peretz/forge-js/compare/eslint-plugin-utils@0.1.1...eslint-plugin-utils@0.2.0
[0.1.1]: https://github.com/ofri-peretz/forge-js/compare/eslint-plugin-utils@0.1.0...eslint-plugin-utils@0.1.1
[0.1.0]: https://github.com/ofri-peretz/forge-js/releases/tag/eslint-plugin-utils@0.1.0
