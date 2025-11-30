# react Configuration

React-specific rules for migration and performance.

## Overview

The `react` configuration provides essential React rules for projects that may still have class components or are in the process of migrating to hooks. It includes migration guidance and basic performance rules.

> **Note:** For modern React codebases using only functional components and hooks, consider using the [`react-modern`](./react-modern.md) configuration instead.

## Quick Start

```javascript
// eslint.config.js
import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';

export default [
  llmOptimized.configs.react,
];
```

## Rules Included

| Rule | Severity | Description |
|------|----------|-------------|
| `migration/react-class-to-hooks` | warn | Suggest migrating class components to hooks |
| `performance/react-no-inline-functions` | warn | Detect inline functions causing re-renders |
| `accessibility/img-requires-alt` | error | Require alt text on images |
| `react/required-attributes` | warn | Validate required component attributes |
| `react/jsx-key` | error | Require unique keys in lists |

## When to Use

**Use `react` when:**
- Your codebase has class components that need migration
- You're gradually adopting hooks
- You want migration suggestions from class to hooks
- You need both class and functional component support

**Use `react-modern` instead when:**
- Your codebase is 100% functional components
- You use hooks exclusively
- You use TypeScript for props validation
- You're on React 17+ with the new JSX transform

## Configuration Examples

### Combined with Recommended

```javascript
export default [
  llmOptimized.configs.recommended,
  llmOptimized.configs.react,
];
```

### React + TypeScript Project

```javascript
import tseslint from 'typescript-eslint';
import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';

export default [
  ...tseslint.configs.recommended,
  llmOptimized.configs.recommended,
  llmOptimized.configs.react,
  {
    files: ['**/*.tsx'],
    rules: {
      // Additional React-specific overrides
    },
  },
];
```

### Gradual Migration Setup

```javascript
export default [
  llmOptimized.configs.react,
  {
    // Stricter rules for new code
    files: ['src/new-features/**/*.tsx'],
    rules: {
      '@forge-js/llm-optimized/migration/react-class-to-hooks': 'error',
    },
  },
  {
    // Relaxed for legacy code being migrated
    files: ['src/legacy/**/*.tsx'],
    rules: {
      '@forge-js/llm-optimized/migration/react-class-to-hooks': 'warn',
    },
  },
];
```

## Migration Guidance

The `migration/react-class-to-hooks` rule provides detailed migration paths:

### Class Component to Hooks

```jsx
// ❌ Class Component (flagged with migration suggestion)
class Counter extends React.Component {
  state = { count: 0 };
  
  increment = () => {
    this.setState(prev => ({ count: prev.count + 1 }));
  };
  
  render() {
    return (
      <button onClick={this.increment}>
        Count: {this.state.count}
      </button>
    );
  }
}

// ✅ Functional Component with Hooks (suggested fix)
function Counter() {
  const [count, setCount] = useState(0);
  
  const increment = useCallback(() => {
    setCount(prev => prev + 1);
  }, []);
  
  return (
    <button onClick={increment}>
      Count: {count}
    </button>
  );
}
```

## Comparison: `react` vs `react-modern`

| Feature | `react` | `react-modern` |
|---------|---------|----------------|
| Class-to-hooks migration | ✅ warn | ❌ off |
| Class component rules | ✅ Active | ❌ Disabled |
| PropTypes rules | ✅ Active | ❌ Disabled |
| Hooks performance rules | ⚠️ Basic | ✅ Comprehensive |
| React import check | ✅ Active | ❌ Disabled |
| Target audience | Mixed codebase | Modern hooks-only |

## Related Configs

- [`react-modern`](./react-modern.md) - For modern React with hooks only
- [`performance`](./performance.md) - Additional performance rules
- [`accessibility`](./accessibility.md) - Additional a11y rules

