# eslint-plugin-dependencies

> ESLint plugin for dependency management with 30 LLM-optimized rules

[![npm version](https://img.shields.io/npm/v/eslint-plugin-dependencies.svg)](https://www.npmjs.com/package/eslint-plugin-dependencies)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive ESLint plugin for dependency management with LLM-optimized error messages, auto-fix capabilities, and structured context for AI assistants.

---

## 📚 Documentation

- **[Rules Reference](./docs/RULES.md)**: Complete list of all 30 rules with configuration options.
- **[ESLint MCP Setup](https://eslint.org/docs/latest/use/mcp)**: Enable AI assistant integration.

---

## Features

- **🔍 30 LLM-Optimized Rules**: Import validation, module resolution, circular dependencies, export style
- **🤖 AI-Ready Error Messages**: Structured 2-line format with fix instructions
- **⚡ Auto-Fix Support**: Many rules support automatic fixes
- **📦 Zero Config Presets**: `recommended`, `strict`, `esm`, `architecture`
- **🔄 Circular Dependency Detection**: Full dependency chain analysis
- **📊 Module Boundary Enforcement**: Clean architecture support

---

## Installation

```bash
npm install --save-dev eslint-plugin-dependencies
# or
pnpm add -D eslint-plugin-dependencies
# or
yarn add -D eslint-plugin-dependencies
```

---

## Quick Start

### ESLint Flat Config (v9+)

```javascript
// eslint.config.js
import dependencies from 'eslint-plugin-dependencies';

export default [
  dependencies.configs.recommended,
];
```

### With TypeScript

```javascript
import dependencies from 'eslint-plugin-dependencies';
import tseslint from 'typescript-eslint';

export default [
  ...tseslint.configs.recommended,
  dependencies.configs.recommended,
];
```

---

## Available Presets

| Preset | Description |
|--------|-------------|
| `recommended` | Balanced configuration for most projects |
| `strict` | All 30 rules as errors for maximum enforcement |
| `module-resolution` | Focus on import/export validation |
| `import-style` | Focus on import formatting and ordering |
| `esm` | Enforce ES Modules, prohibit CommonJS/AMD |
| `architecture` | Enforce module boundaries and clean architecture |

---

## Rule Categories

### Module Resolution (7 rules)

| Rule | Description |
|------|-------------|
| [`no-unresolved`](./docs/rules/no-unresolved.md) | Ensure imports resolve to a module |
| [`named`](./docs/rules/named.md) | Ensure named imports exist |
| [`default`](./docs/rules/default.md) | Ensure default export exists |
| [`namespace`](./docs/rules/namespace.md) | Ensure namespace imports are valid |
| [`extensions`](./docs/rules/extensions.md) | Enforce file extension usage |
| [`no-self-import`](./docs/rules/no-self-import.md) | Prevent module from importing itself |
| [`no-duplicates`](./docs/rules/no-duplicates.md) | Prevent duplicate imports |

### Module System (3 rules)

| Rule | Description |
|------|-------------|
| [`no-amd`](./docs/rules/no-amd.md) | Disallow AMD imports |
| [`no-commonjs`](./docs/rules/no-commonjs.md) | Disallow CommonJS imports |
| [`no-nodejs-modules`](./docs/rules/no-nodejs-modules.md) | Disallow Node.js built-in modules |

### Dependency Boundaries (6 rules)

| Rule | Description |
|------|-------------|
| [`no-circular-dependencies`](./docs/rules/no-circular-dependencies.md) | Detect circular dependency chains |
| [`no-internal-modules`](./docs/rules/no-internal-modules.md) | Forbid deep/internal module imports |
| [`no-cross-domain-imports`](./docs/rules/no-cross-domain-imports.md) | Enforce domain boundaries |
| [`enforce-dependency-direction`](./docs/rules/enforce-dependency-direction.md) | Enforce layered architecture |
| [`no-restricted-paths`](./docs/rules/no-restricted-paths.md) | Restrict imports between paths |
| [`no-relative-parent-imports`](./docs/rules/no-relative-parent-imports.md) | Disallow `../` imports |

### Export Style (6 rules)

| Rule | Description |
|------|-------------|
| [`no-default-export`](./docs/rules/no-default-export.md) | Disallow default exports |
| [`no-named-export`](./docs/rules/no-named-export.md) | Disallow named exports |
| [`prefer-default-export`](./docs/rules/prefer-default-export.md) | Prefer default for single exports |
| [`no-anonymous-default-export`](./docs/rules/no-anonymous-default-export.md) | Disallow anonymous default exports |
| [`no-mutable-exports`](./docs/rules/no-mutable-exports.md) | Disallow mutable exports |
| [`no-deprecated`](./docs/rules/no-deprecated.md) | Disallow deprecated exports |

### Import Style (4 rules)

| Rule | Description |
|------|-------------|
| [`enforce-import-order`](./docs/rules/enforce-import-order.md) | Enforce import ordering |
| [`first`](./docs/rules/first.md) | Ensure imports are at the top |
| [`newline-after-import`](./docs/rules/newline-after-import.md) | Require newline after imports |
| [`no-unassigned-import`](./docs/rules/no-unassigned-import.md) | Disallow side-effect imports |

### Dependency Management (4 rules)

| Rule | Description |
|------|-------------|
| [`no-extraneous-dependencies`](./docs/rules/no-extraneous-dependencies.md) | Disallow unlisted dependencies |
| [`no-unused-modules`](./docs/rules/no-unused-modules.md) | Detect unused exports/modules |
| [`max-dependencies`](./docs/rules/max-dependencies.md) | Limit number of dependencies |
| [`prefer-node-protocol`](./docs/rules/prefer-node-protocol.md) | Prefer `node:` protocol for builtins |

---

## Custom Configuration

```javascript
// eslint.config.js
import dependencies from 'eslint-plugin-dependencies';

export default [
  {
    plugins: {
      dependencies: dependencies,
    },
    rules: {
      'dependencies/no-circular-dependencies': 'error',
      'dependencies/enforce-import-order': ['error', {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
      }],
      'dependencies/no-restricted-paths': ['error', {
        zones: [
          { target: './src/features', from: './src/core' },
        ],
      }],
    },
  },
];
```

---

## ESLint MCP Integration

This plugin is optimized for ESLint's Model Context Protocol (MCP):

**Cursor (.cursor/mcp.json):**

```json
{
  "mcpServers": {
    "eslint": {
      "command": "npx",
      "args": ["@eslint/mcp@latest"]
    }
  }
}
```

---

## Related Packages

- **[@forge-js/eslint-plugin-llm-optimized](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized)** - Full plugin with 100+ rules
- **[eslint-plugin-secure-coding](https://www.npmjs.com/package/eslint-plugin-secure-coding)** - Security-focused rules
- **[eslint-plugin-react-a11y](https://www.npmjs.com/package/eslint-plugin-react-a11y)** - Accessibility rules
- **[@interlace/eslint-devkit](https://www.npmjs.com/package/@interlace/eslint-devkit)** - Build custom LLM-optimized rules

---

## License

MIT © Ofri Peretz
