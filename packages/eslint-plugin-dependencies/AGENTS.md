# eslint-plugin-dependencies - AI Agent Guide

## Package Overview

| Field           | Value                                                               |
| --------------- | ------------------------------------------------------------------- |
| **Name**        | eslint-plugin-dependencies                                          |
| **Version**     | 1.0.0                                                               |
| **Description** | ESLint plugin for dependency management with 30 LLM-optimized rules |
| **Type**        | ESLint Plugin                                                       |
| **Language**    | TypeScript                                                          |
| **Node.js**     | >=18.0.0                                                            |
| **ESLint**      | ^8.0.0 \|\| ^9.0.0                                                  |
| **License**     | MIT                                                                 |
| **Homepage**    | https://github.com/ofri-peretz/forge-js#readme                      |
| **Repository**  | https://github.com/ofri-peretz/forge-js.git                         |
| **Directory**   | packages/eslint-plugin-dependencies                                 |

## Installation

```bash
npm install --save-dev eslint-plugin-dependencies
# or
pnpm add -D eslint-plugin-dependencies
# or
yarn add -D eslint-plugin-dependencies
```

## Quick Start

```javascript
// eslint.config.js
import dependencies from 'eslint-plugin-dependencies';

export default [dependencies.configs.recommended];
```

## Available Presets

| Preset                | Rules                       | Description                              |
| --------------------- | --------------------------- | ---------------------------------------- |
| **recommended**       | 13 rules (mixed error/warn) | Balanced configuration for most projects |
| **strict**            | 30 rules (all errors)       | Maximum enforcement                      |
| **module-resolution** | 7 rules                     | Focus on import/export validation        |
| **import-style**      | 5 rules                     | Focus on import formatting               |
| **esm**               | 3 rules                     | Enforce ES Modules only                  |
| **architecture**      | 6 rules                     | Enforce module boundaries                |

## Rule Categories

### Module Resolution (7 rules)

- `no-unresolved` - Ensure imports resolve
- `named` - Ensure named imports exist
- `default` - Ensure default export exists
- `namespace` - Validate namespace imports
- `extensions` - Enforce file extensions
- `no-self-import` - Prevent self-imports
- `no-duplicates` - Prevent duplicate imports

### Module System (3 rules)

- `no-amd` - Disallow AMD
- `no-commonjs` - Disallow CommonJS
- `no-nodejs-modules` - Disallow Node.js builtins

### Dependency Boundaries (6 rules)

- `no-circular-dependencies` - Detect cycles
- `no-internal-modules` - Forbid deep imports
- `no-cross-domain-imports` - Enforce domains
- `enforce-dependency-direction` - Layered architecture
- `no-restricted-paths` - Restrict paths
- `no-relative-parent-imports` - No `../` imports

### Export Style (6 rules)

- `no-default-export` - Disallow default exports
- `no-named-export` - Disallow named exports
- `prefer-default-export` - Prefer default
- `no-anonymous-default-export` - Named defaults only
- `no-mutable-exports` - Immutable exports
- `no-deprecated` - No deprecated exports

### Import Style (4 rules)

- `enforce-import-order` - Order imports
- `first` - Imports at top
- `newline-after-import` - Newline after imports
- `no-unassigned-import` - No side-effect imports

### Dependency Management (4 rules)

- `no-extraneous-dependencies` - Listed deps only
- `no-unused-modules` - No unused exports
- `max-dependencies` - Limit deps
- `prefer-node-protocol` - Use `node:` prefix

## Error Message Format

All rules produce LLM-optimized 2-line structured messages:

```
Line 1: [Icon] [CWE (if applicable)] | [Description] | [SEVERITY]
Line 2:    Fix: [instruction] | [doc-link]
```

**Example:**

```
🏗️ CWE-407 | Circular dependency detected: A → B → C → A | HIGH
   Fix: Extract shared code to types.ts, break cycle at C.ts | https://en.wikipedia.org/wiki/Circular_dependency
```

## ESLint MCP Integration

Configure in `.cursor/mcp.json`:

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

## Key Features

| Feature              | Value                      |
| -------------------- | -------------------------- |
| **Total Rules**      | 30                         |
| **AI Auto-Fix Rate** | 60-80%                     |
| **Performance**      | <10ms overhead per file    |
| **Privacy**          | 100% local, no cloud calls |

## FAQ

**Q: How do I enable all rules?**
A: Use `dependencies.configs.strict`

**Q: How do I configure a specific rule?**
A: `'dependencies/no-circular-dependencies': ['error', { maxDepth: 5 }]`

**Q: How do I disable a rule inline?**
A: `// eslint-disable-next-line dependencies/no-circular-dependencies`

**Q: Is it compatible with TypeScript?**
A: Yes, native TypeScript support.

**Q: Does it work with ESLint 9 flat config?**
A: Yes, fully compatible.

## Related Packages

- **@forge-js/eslint-plugin-llm-optimized** - Full plugin with 100+ rules
- **eslint-plugin-secure-coding** - Security-focused rules
- **eslint-plugin-react-a11y** - Accessibility rules
- **@interlace/eslint-devkit** - Build custom LLM-optimized rules

## License

MIT © Ofri Peretz
