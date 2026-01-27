---
title: react-no-inline-functions
description: react-no-inline-functions rule
category: quality
severity: low
tags: ['quality', 'react']
autofix: suggestions
affects: ['readability', 'maintainability']
effort: low
---# react-no-inline-functions

> **Keywords:** React, performance, ESLint rule, inline functions, useCallback, React optimization, re-renders, auto-fix, LLM-optimized, React performance

Prevent inline functions in React renders with performance metrics. This rule is part of [`@eslint/eslint-plugin-react-features`](https://www.npmjs.com/package/@eslint/eslint-plugin-react-features) and provides LLM-optimized error messages with fix suggestions.

**💡 Provides suggestions** | **🔧 Automatically fixable**

## Quick Summary

| Aspect | Details |
|--------|---------|
| **Severity** | Warning (performance best practice) |
| **Auto-Fix** | ✅ Yes (suggests useCallback) |
| **Category** | React / Performance |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration |
| **Best For** | React/Next.js applications, performance-critical components |

## Rule Details

Detects inline functions in React JSX that cause unnecessary re-renders, providing performance impact analysis.

## Configuration

| Option                 | Type      | Default | Description                                               |
| ---------------------- | --------- | ------- | --------------------------------------------------------- |
| `allowInEventHandlers` | `boolean` | `false` | Allow inline functions in event handlers                  |
| `minArraySize`         | `number`  | `10`    | Minimum array size to report inline functions in `.map()` |

## Examples

### ❌ Incorrect

```typescript
function TodoList({ todos }: Props) {
  return (
    <div>
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onDelete={() => deleteTodo(todo.id)}  // ❌ Inline function
        />
      ))}
    </div>
  );
}
```

### ✅ Correct

```typescript
function TodoList({ todos }: Props) {
  const handleDelete = useCallback((todoId: string) => {
    deleteTodo(todoId);
  }, []);

  return (
    <div>
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onDelete={() => handleDelete(todo.id)}  // ✅ Using useCallback
        />
      ))}
    </div>
  );
}
```

## Configuration Examples

### ESLint 9+ (Flat Config)

```typescript
import llmOptimized from '@eslint/eslint-plugin-react-features';
import type { ReactNoInlineFunctionsOptions } from '@eslint/eslint-plugin-react-features/types';

const inlineConfig: ReactNoInlineFunctionsOptions = {
  allowInEventHandlers: true, // Allow simple event handlers
  minArraySize: 5, // Only warn for large lists
};

export default [
  {
    plugins: {
      'eslint-plugin-llm-optimized': llmOptimized,
    },
    rules: {
      'eslint-plugin-llm-optimized/performance/react-no-inline-functions': [
        'warn',
        inlineConfig,
      ],
    },
  },
];
```

### ESLint 8 (Legacy Config with JSDoc Types)

```javascript
/** @type {import('@eslint/eslint-plugin-react-features/types').ReactNoInlineFunctionsOptions} */
const inlineConfig = {
  allowInEventHandlers: true, // Allow simple event handlers
  minArraySize: 5, // Only warn for large lists
};

module.exports = {
  plugins: ['@eslint/eslint-plugin-react-features'],
  rules: {
    '@eslint/eslint-plugin-react-features/performance/react-no-inline-functions':
      ['warn', inlineConfig],
  },
};
```

For more examples and patterns, see [CONFIGURATION_EXAMPLES.md](../../src/types/CONFIGURATION_EXAMPLES.md#react-no-inline-functions)

## Performance Impact

| Array Size | Re-renders | Impact         |
| ---------- | ---------- | -------------- |
| 1-10       | Low        | 🟢 Minor       |
| 11-100     | Medium     | 🟡 Moderate    |
| 100+       | High       | 🔴 Significant |

## Comparison with Alternatives

| Feature | react-no-inline-functions | eslint-plugin-react | react-hooks/exhaustive-deps |
|---------|--------------------------|---------------------|----------------------------|
| **Inline Function Detection** | ✅ Yes | ⚠️ Limited | ❌ No |
| **Performance Metrics** | ✅ Yes | ❌ No | ❌ No |
| **Auto-Fix** | ✅ Yes | ❌ No | ❌ No |
| **LLM-Optimized** | ✅ Yes | ❌ No | ❌ No |
| **ESLint MCP** | ✅ Optimized | ❌ No | ❌ No |
| **useCallback Suggestions** | ✅ Yes | ❌ No | ⚠️ Limited |

## Related Rules

- [`react-class-to-hooks`](./react-class-to-hooks.md) - Migration to hooks
- [`required-attributes`](./required-attributes.md) - React attribute enforcement
- [`img-requires-alt`](./img-requires-alt.md) - Image accessibility

## Further Reading

- **[React Performance Optimization](https://react.dev/learn/render-and-commit)** - React rendering guide
- **[useCallback Hook](https://react.dev/reference/react/useCallback)** - useCallback documentation
- **[ESLint MCP Setup](https://eslint.org/docs/latest/use/mcp)** - Enable AI assistant integration
## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Dynamic Variable References

**Why**: Static analysis cannot trace values stored in variables or passed through function parameters.

```typescript
// ❌ NOT DETECTED - Prop from variable
const propValue = computedValue;
<Component prop={propValue} /> // Computation not analyzed
```

**Mitigation**: Implement runtime validation and review code manually. Consider using TypeScript branded types for validated inputs.

### Wrapped or Aliased Functions

**Why**: Custom wrapper functions or aliased methods are not recognized by the rule.

```typescript
// ❌ NOT DETECTED - Custom wrapper
function myWrapper(data) {
  return internalApi(data); // Wrapper not analyzed
}
myWrapper(unsafeInput);
```

**Mitigation**: Apply this rule's principles to wrapper function implementations. Avoid aliasing security-sensitive functions.

### Imported Values

**Why**: When values come from imports, the rule cannot analyze their origin or construction.

```typescript
// ❌ NOT DETECTED - Value from import
import { getValue } from './helpers';
processValue(getValue()); // Cross-file not tracked
```

**Mitigation**: Ensure imported values follow the same constraints. Use TypeScript for type safety.


