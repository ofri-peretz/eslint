# react-modern Configuration

Modern React configuration optimized for **functional components and hooks**.

## Overview

The `react-modern` configuration is designed for React codebases that:
- Use functional components exclusively (or primarily)
- Rely on hooks for state and side effects
- Use TypeScript for type safety instead of PropTypes
- Target React 17+ (no need for explicit React imports)

## Quick Start

```javascript
// eslint.config.js
import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';

export default [
  llmOptimized.configs['react-modern'],
];
```

## Rules Enabled

### Performance Rules

| Rule | Severity | Description |
|------|----------|-------------|
| `performance/react-no-inline-functions` | warn | Detect inline functions that cause unnecessary re-renders |
| `performance/react-render-optimization` | warn | Suggest useMemo/useCallback for expensive computations |
| `performance/no-unnecessary-rerenders` | warn | Detect patterns causing unnecessary component re-renders |
| `performance/no-memory-leak-listeners` | warn | Detect missing cleanup in useEffect listeners |

### JSX Rules

| Rule | Severity | Description |
|------|----------|-------------|
| `react/jsx-key` | error | Require unique keys for list items (critical for React reconciliation) |
| `react/jsx-no-bind` | warn | Prevent `.bind()` in JSX props (use useCallback instead) |

### Functional Component Rules

| Rule | Severity | Description |
|------|----------|-------------|
| `react/no-this-in-sfc` | error | Catch `this` usage in functional components (common mistake) |
| `react/no-unknown-property` | error | Catch typos in JSX properties (e.g., `classname` → `className`) |
| `react/no-children-prop` | warn | Use React.Children API instead of children prop |
| `react/no-danger` | warn | Warn on dangerouslySetInnerHTML (XSS risk) |
| `react/no-object-type-as-default-prop` | warn | Detect stale closure traps with object default values |
| `react/no-string-refs` | error | Enforce useRef hook instead of string refs |

### Accessibility

| Rule | Severity | Description |
|------|----------|-------------|
| `accessibility/img-requires-alt` | error | Images must have alt text for WCAG compliance |

### Other

| Rule | Severity | Description |
|------|----------|-------------|
| `react/required-attributes` | warn | Validate required component attributes |
| `react/no-invalid-html-attribute` | warn | Catch invalid HTML attributes |

## Rules Disabled

These class component rules are explicitly disabled to avoid false positives:

### Class-specific setState Rules
- `react/no-set-state` - Use useState hook instead
- `react/no-direct-mutation-state` - State mutation in classes
- `react/no-access-state-in-setstate` - Accessing this.state in setState
- `react/no-did-mount-set-state` - setState in componentDidMount
- `react/no-did-update-set-state` - setState in componentDidUpdate

### Class-specific Lifecycle Rules
- `react/no-is-mounted` - isMounted anti-pattern
- `react/no-arrow-function-lifecycle` - Arrow functions in lifecycle
- `react/no-redundant-should-component-update` - Use React.memo instead
- `react/require-render-return` - Class render method validation

### Class-specific Structure Rules
- `react/sort-comp` - Class method ordering
- `react/state-in-constructor` - State initialization patterns
- `react/static-property-placement` - Static property placement
- `react/prefer-es6-class` - ES6 class preference

### Legacy PropTypes/defaultProps
- `react/default-props-match-prop-types` - Use TypeScript instead
- `react/require-default-props` - Use TypeScript default params
- `react/prop-types` - Use TypeScript for type checking
- `react/require-optimization` - Use React.memo for functional components

### Other Disabled
- `migration/react-class-to-hooks` - Only enable when actively migrating
- `react/react-in-jsx-scope` - Not needed with React 17+ JSX transform

## Comparison with `react` Configuration

| Feature | `react` Config | `react-modern` Config |
|---------|----------------|----------------------|
| Class-to-hooks migration | ✅ Enabled (warn) | ❌ Disabled |
| Class component rules | ✅ Active | ❌ Disabled |
| Hooks performance rules | ⚠️ Basic | ✅ Comprehensive |
| PropTypes rules | ✅ Active | ❌ Disabled |
| React import check | ✅ Active | ❌ Disabled (React 17+) |

## When to Use

**Use `react-modern` when:**
- Your codebase is 100% functional components
- You use hooks for all state and side effects
- You use TypeScript for type safety
- You're targeting React 17 or higher

**Use `react` config instead when:**
- Your codebase has class components that need to be migrated
- You're actively converting class components to hooks
- You need PropTypes validation (not using TypeScript)

## Combining with Other Configs

```javascript
// eslint.config.js
import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';

export default [
  // Base security and architecture rules
  llmOptimized.configs.recommended,
  
  // Modern React rules
  llmOptimized.configs['react-modern'],
  
  // Additional customizations
  {
    rules: {
      // Override specific rules if needed
      '@forge-js/llm-optimized/react/jsx-no-bind': 'error', // Make it stricter
    },
  },
];
```

## Migrating from Class Components

If you have some class components that need migration, you can enable the migration rule selectively:

```javascript
export default [
  llmOptimized.configs['react-modern'],
  {
    files: ['**/legacy/**/*.tsx', '**/legacy/**/*.jsx'],
    rules: {
      '@forge-js/llm-optimized/migration/react-class-to-hooks': 'warn',
    },
  },
];
```

