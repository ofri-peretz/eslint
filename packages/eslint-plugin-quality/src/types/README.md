# ESLint Plugin Rule Options Types

This directory contains TypeScript type definitions for all ESLint rule options exported by `@forge-js/eslint-plugin-llm-optimized`.

## Overview

All rule Options interfaces are exported from the barrel file `index.ts` with a consistent naming pattern:

```
<RuleName>Options
```

**Total Rules:** 19

- **Accessibility:** 1 rule
- **Architecture:** 2 rules
- **Complexity:** 1 rule
- **Deprecation:** 1 rule
- **Development:** 1 rule
- **Domain:** 1 rule
- **Duplication:** 1 rule
- **Migration:** 1 rule
- **Performance:** 1 rule
- **React:** 1 rule
- **Security:** 8 rules

## Import Methods

### Method 1: From Main Package (Recommended)

```typescript
import type { ReactNoInlineFunctionsOptions } from '@forge-js/eslint-plugin-llm-optimized';
```

### Method 2: From Types Subpath

```typescript
import type { ReactNoInlineFunctionsOptions } from '@forge-js/eslint-plugin-llm-optimized/types';
```

## Available Types

All exported types are organized by category. For the **complete and always up-to-date list**, see:

**→ [index.ts](./index.ts)** (Single source of truth - all re-exports)

### Current Categories

The types are organized into logical categories including (but not limited to):

- **Accessibility** - WCAG compliance and a11y rules
- **Architecture** - Module organization and dependency management
- **Complexity** - Code quality and cognitive complexity
- **Deprecation** - API migration and deprecation guidance
- **Development** - Development-time checks and best practices
- **Domain** - Domain-specific naming and terminology
- **Duplication** - Code duplication and DRY principle
- **Migration** - Framework/library migration assistance
- **Performance** - Runtime performance optimization
- **React** - React-specific component rules
- **Security** - Security vulnerability detection

Plus:

- **`AllRulesOptions`** - Combined type containing all rule options keyed by rule name

### Viewing All Rules

For the current list of all rules and their exports:

```bash
# Check the barrel file (single source of truth)
cat src/types/index.ts

# Or see main exports
cat src/index.ts
```

**Note:** This documentation avoids hardcoded rule counts to remain maintainable as new rules are added (see [ROADMAP.md](../../../docs/ROADMAP.md) for planned future rules).

## Usage Examples

For **comprehensive configuration examples** including:

- ESLint 9+ (Flat Config) setup
- ESLint 8 (Legacy) setup
- Individual rule configurations
- Advanced patterns and team standards

→ **See [CONFIGURATION_EXAMPLES.md](./CONFIGURATION_EXAMPLES.md)**

### Quick Example

```typescript
import type { ReactNoInlineFunctionsOptions } from '@forge-js/eslint-plugin-llm-optimized/types';

const config: ReactNoInlineFunctionsOptions = {
  allowInEventHandlers: true,
  minArraySize: 20,
};
```

## Type Safety Benefits

By using these exported types, you get:

✅ **IDE Autocomplete** - Full IntelliSense for all options
✅ **Type Checking** - TypeScript catches configuration errors at compile time
✅ **Documentation** - Inline JSDoc comments with examples
✅ **Consistency** - Standardized naming across all rules
✅ **Maintainability** - Changes to rule options automatically update type definitions

## Pattern: `<RuleName>Options`

All exported types follow this naming convention:

| Rule Name                   | Type Name                       |
| --------------------------- | ------------------------------- |
| `img-requires-alt`          | `ImgRequiresAltOptions`         |
| `no-circular-dependencies`  | `NoCircularDependenciesOptions` |
| `react-no-inline-functions` | `ReactNoInlineFunctionsOptions` |
| `no-console-log`            | `NoConsoleLogOptions`           |
| `cognitive-complexity`      | `CognitiveComplexityOptions`    |

## Implementation Details

### File Structure

```
src/types/
├── index.ts           # Barrel file - all exports
├── __example.ts       # Usage examples
└── README.md          # This file
```

### Barrel File Pattern

The `index.ts` file re-exports all Options types from their respective rule files:

```typescript
export type { Options as ReactNoInlineFunctionsOptions } from '../rules/performance/react-no-inline-functions';
export type { Options as NoCircularDependenciesOptions } from '../rules/architecture/no-circular-dependencies';
// ... more exports
```

This approach:

- ✅ Keeps rule implementations isolated
- ✅ Maintains a single source of truth for exports
- ✅ Enables tree-shaking of unused types
- ✅ Supports both subpath and main package imports

## ESLint Configuration Examples

### ESLint 9+ (Flat Config)

```typescript
import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';
import type { ReactNoInlineFunctionsOptions } from '@forge-js/eslint-plugin-llm-optimized/types';

const inlineConfig: ReactNoInlineFunctionsOptions = {
  allowInEventHandlers: true,
  minArraySize: 20,
};

export default [
  {
    plugins: {
      '@forge-js/llm-optimized': llmOptimized,
    },
    rules: {
      '@forge-js/llm-optimized/performance/react-no-inline-functions': [
        'warn',
        inlineConfig,
      ],
    },
  },
];
```

### ESLint 8 (Legacy Config)

```javascript
module.exports = {
  plugins: ['@forge-js/llm-optimized'],
  extends: ['plugin:@forge-js/llm-optimized/recommended'],
  rules: {
    '@forge-js/llm-optimized/performance/react-no-inline-functions': [
      'warn',
      {
        allowInEventHandlers: true,
        minArraySize: 20,
      },
    ],
  },
};
```

## Integration with TypeScript

### Type-Safe Configuration File

```typescript
// eslint.config.ts
import type {
  ReactNoInlineFunctionsOptions,
  NoCircularDependenciesOptions,
} from '@forge-js/eslint-plugin-llm-optimized/types';

type RuleConfig = [string, object?];

const ruleName = (name: string, options?: object): RuleConfig => [
  name,
  options,
];

export const reactInlineRule: RuleConfig = ruleName(
  '@forge-js/llm-optimized/performance/react-no-inline-functions',
  {
    allowInEventHandlers: true,
    minArraySize: 20,
  } satisfies ReactNoInlineFunctionsOptions,
);
```

## Related Documentation

- [ESLint Plugins Documentation](https://eslint.org/docs/latest/extend/plugins)
- [ESLint Flat Config](https://eslint.org/docs/latest/use/configure/configuration-files-new)
- [TypeScript Types Guide](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html)

## Questions or Issues?

For issues related to specific rule configurations, see the corresponding rule documentation in the `src/rules/` directory.
