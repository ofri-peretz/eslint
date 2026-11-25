# 📚 Rules Reference (30 Rules)

💼 Set in `recommended` | ⚠️ Warns in `recommended` | 🔧 Auto-fixable | 💡 Editor suggestions

---

## Module Resolution (7 rules)

| Name                                        | Description                                 | 💼  | ⚠️  | 🔧  | 💡  |
| ------------------------------------------- | ------------------------------------------- | --- | --- | --- | --- |
| [no-unresolved](./rules/no-unresolved.md)   | Ensure imports resolve to a module          | 💼  |     |     | 💡  |
| [named](./rules/named.md)                   | Ensure named imports exist in target module | 💼  |     |     | 💡  |
| [default](./rules/default.md)               | Ensure default export exists                | 💼  |     |     | 💡  |
| [namespace](./rules/namespace.md)           | Ensure namespace imports are valid          |     | ⚠️  |     | 💡  |
| [extensions](./rules/extensions.md)         | Enforce file extension usage                |     |     |     | 💡  |
| [no-self-import](./rules/no-self-import.md) | Prevent module from importing itself        | 💼  |     |     | 💡  |
| [no-duplicates](./rules/no-duplicates.md)   | Prevent duplicate imports                   | 💼  |     | 🔧  |     |

## Module System (4 rules)

| Name                                                            | Description                               | 💼  | ⚠️  | 🔧  | 💡  |
| --------------------------------------------------------------- | ----------------------------------------- | --- | --- | --- | --- |
| [no-amd](./rules/no-amd.md)                                     | Disallow AMD define/require               |     | ⚠️  |     | 💡  |
| [no-commonjs](./rules/no-commonjs.md)                           | Disallow CommonJS require/exports         |     | ⚠️  |     | 💡  |
| [no-nodejs-modules](./rules/no-nodejs-modules.md)               | Disallow Node.js built-in modules         |     |     |     | 💡  |
| [no-webpack-loader-syntax](./rules/no-webpack-loader-syntax.md) | Disallow webpack loader syntax in imports |     |     |     |     |

## Dependency Boundaries (6 rules)

| Name                                                                    | Description                         | 💼  | ⚠️  | 🔧  | 💡  |
| ----------------------------------------------------------------------- | ----------------------------------- | --- | --- | --- | --- |
| [no-cycle](./rules/no-cycle.md)                                         | Detect circular dependency chains   | 💼  |     |     | 💡  |
| [no-internal-modules](./rules/no-internal-modules.md)                   | Forbid deep/internal module imports |     |     |     | 💡  |
| [no-cross-domain-imports](./rules/no-cross-domain-imports.md)           | Enforce domain boundaries           |     |     |     | 💡  |
| [enforce-dependency-direction](./rules/enforce-dependency-direction.md) | Enforce layered architecture        |     |     |     | 💡  |
| [no-restricted-paths](./rules/no-restricted-paths.md)                   | Restrict imports between paths      |     |     |     | 💡  |
| [no-relative-parent-imports](./rules/no-relative-parent-imports.md)     | Disallow `../` parent imports       |     |     |     | 💡  |

## Export Style (6 rules)

| Name                                                                  | Description                              | 💼  | ⚠️  | 🔧  | 💡  |
| --------------------------------------------------------------------- | ---------------------------------------- | --- | --- | --- | --- |
| [no-default-export](./rules/no-default-export.md)                     | Disallow default exports                 |     |     |     | 💡  |
| [no-named-export](./rules/no-named-export.md)                         | Disallow named exports                   |     |     |     | 💡  |
| [prefer-default-export](./rules/prefer-default-export.md)             | Prefer default export for single exports |     |     |     | 💡  |
| [no-anonymous-default-export](./rules/no-anonymous-default-export.md) | Disallow anonymous default exports       |     |     |     | 💡  |
| [no-mutable-exports](./rules/no-mutable-exports.md)                   | Disallow mutable exports (let, var)      |     |     |     | 💡  |
| [no-deprecated](./rules/no-deprecated.md)                             | Disallow importing deprecated exports    |     |     |     | 💡  |

## Import Style (4 rules)

| Name                                                    | Description                           | 💼  | ⚠️  | 🔧  | 💡  |
| ------------------------------------------------------- | ------------------------------------- | --- | --- | --- | --- |
| [enforce-import-order](./rules/enforce-import-order.md) | Enforce consistent import ordering    |     | ⚠️  | 🔧  |     |
| [first](./rules/first.md)                               | Ensure imports are at the top of file |     | ⚠️  | 🔧  |     |
| [newline-after-import](./rules/newline-after-import.md) | Require newline after import section  |     | ⚠️  | 🔧  |     |
| [no-unassigned-import](./rules/no-unassigned-import.md) | Disallow side-effect-only imports     |     |     |     | 💡  |

## Dependency Management (5 rules)

| Name                                                                  | Description                                         | 💼  | ⚠️  | 🔧  | 💡  |
| --------------------------------------------------------------------- | --------------------------------------------------- | --- | --- | --- | --- |
| [no-extraneous-dependencies](./rules/no-extraneous-dependencies.md)   | Disallow importing unlisted packages                |     | ⚠️  |     | 💡  |
| [no-unused-modules](./rules/no-unused-modules.md)                     | Detect unused exports and modules                   |     |     |     | 💡  |
| [max-dependencies](./rules/max-dependencies.md)                       | Limit maximum number of dependencies                |     |     |     | 💡  |
| [prefer-node-protocol](./rules/prefer-node-protocol.md)               | Prefer `node:` protocol for builtins                |     |     | 🔧  |     |
| [enforce-node-protocol-usage](./rules/enforce-node-protocol-usage.md) | Always, or never, the `node:` protocol for builtins |     |     | 🔧  |     |

---

## Preset Configurations

### recommended

Balanced configuration for most projects:

```javascript
import dependencies from 'eslint-plugin-dependencies';

export default [dependencies.configs.recommended];
```

**Includes:**

- Module resolution rules as errors
- Circular dependency detection as error
- Import style rules as warnings
- Module system rules as warnings

### strict

All 30 rules enabled as errors:

```javascript
import dependencies from 'eslint-plugin-dependencies';

export default [dependencies.configs.strict];
```

### architecture

Focus on module boundaries and clean architecture:

```javascript
import dependencies from 'eslint-plugin-dependencies';

export default [dependencies.configs.architecture];
```

**Includes:**

- `no-cycle`
- `no-internal-modules`
- `no-cross-domain-imports`
- `enforce-dependency-direction`
- `no-restricted-paths`
- `no-relative-parent-imports`

### esm

Enforce ES Modules, prohibit CommonJS/AMD:

```javascript
import dependencies from 'eslint-plugin-dependencies';

export default [dependencies.configs.esm];
```

**Includes:**

- `no-amd`
- `no-commonjs`
- `prefer-node-protocol`

---

## Rule Configuration Examples

### Circular Dependencies

```javascript
{
  rules: {
    'dependencies/no-cycle': ['error', {
      maxDepth: 5,
      ignorePatterns: ['**/*.test.ts'],
    }],
  },
}
```

### Import Order

```javascript
{
  rules: {
    'dependencies/enforce-import-order': ['error', {
      groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
      alphabetize: { order: 'asc', caseInsensitive: true },
    }],
  },
}
```

### Restricted Paths

```javascript
{
  rules: {
    'dependencies/no-restricted-paths': ['error', {
      zones: [
        { target: './src/features', from: './src/core' },
        { target: './src/ui', from: './src/data' },
      ],
    }],
  },
}
```

### Dependency Direction (Layered Architecture)

```javascript
{
  rules: {
    'dependencies/enforce-dependency-direction': ['error', {
      layers: ['ui', 'features', 'services', 'data', 'core'],
      // ui can import from features, services, data, core
      // core cannot import from any other layer
    }],
  },
}
```
