---
title: react-no-inline-functions
description: react-no-inline-functions rule
tags: ['quality', 'react']
category: quality
autofix: suggestions
---


<!-- @rule-summary -->
react-no-inline-functions rule
<!-- @/rule-summary -->

# react-no-inline-functions

> **Keywords:** React, performance, ESLint rule, inline functions, useCallback, React optimization, re-renders, auto-fix, LLM-optimized, React performance

Prevent inline functions in React renders with performance metrics. This rule is part of [`eslint-plugin-react-features`](https://www.npmjs.com/package/eslint-plugin-react-features) and provides LLM-optimized error messages with fix suggestions.

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

An inline function written as a prop (`onSelect={() => …}`, a function
expression, or a choice between two) is a new function on every render. It
costs a re-render only when the receiver skips re-rendering on equal props: a
component the file wraps in React's `memo` (any spelling, including
`memo(forwardRef(...))`) or a class extending React's `PureComponent`. The rule
reports those. A function child (`<Loader>{(data) => …}</Loader>`) is the
`children` prop and is judged the same way.

It does not report:

- a host element (`<button onClick={() => …}>`, `<my-widget>`): React updates
  the DOM listener; there is no render to save;
- a component the file defines without `memo` (a function, an arrow,
  `forwardRef(...)`, a `Component` class): it re-renders with its parent
  whatever its props are;
- a callback passed to a call (`{items.map((item) => <li … />)}`,
  `onSelect={debounce(() => …)}`): it is not itself a prop;
- a function passed by reference (`onSelect={handleSelect}`).

## Configuration

| Option                 | Type      | Default | Description                                               |
| ---------------------- | --------- | ------- | --------------------------------------------------------- |
| `allowInEventHandlers` | `boolean` | `false` | Allow inline functions in event-handler props: `on` + a capital letter (`onClick`), React's naming. `only` or `renderItem` is not one. |
| `minArraySize`         | `number`  | `5`     | Accepted for compatibility; has no effect (the size of an array is not known statically). |

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
  const onDelete = useCallback((id: string) => deleteTodo(id), []);
  return todos.map((todo) => (
    <TodoItem key={todo.id} todo={todo} onDelete={onDelete} />
  ));
}

// A host element has no render to save.
<button onClick={() => save()}>Save</button>;
```

## Configuration Examples

### ESLint 9+ (Flat Config)

```typescript
import reactFeatures from 'eslint-plugin-react-features';
import type { ReactNoInlineFunctionsOptions } from 'eslint-plugin-react-features/types';

const inlineConfig: ReactNoInlineFunctionsOptions = {
  allowInEventHandlers: true, // Allow simple event handlers
  minArraySize: 5, // Only warn for large lists
};

export default [
  {
    plugins: {
      'react-features': reactFeatures,
    },
    rules: {
      'react-features/react-no-inline-functions': ['warn', inlineConfig],
    },
  },
];
```

### ESLint 8 (Legacy Config with JSDoc Types)

```javascript
/** @type {import('eslint-plugin-react-features/types').ReactNoInlineFunctionsOptions} */
const inlineConfig = {
  allowInEventHandlers: true, // Allow simple event handlers
  minArraySize: 5, // Only warn for large lists
};

module.exports = {
  plugins: ['react-features'],
  rules: {
    'react-features/react-no-inline-functions': ['warn', inlineConfig],
  },
};
```

For more examples and patterns, see the [package README](../../README.md).

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
- `img-requires-alt` (planned) - Image accessibility

## Further Reading

- **[React Performance Optimization](https://react.dev/learn/render-and-commit)** - React rendering guide
- **[useCallback Hook](https://react.dev/reference/react/useCallback)** - useCallback documentation
- **[ESLint MCP Setup](https://eslint.org/docs/latest/use/mcp)** - Enable AI assistant integration
## Known False Positives

- **A component the file cannot see** (an import such as `TodoItem` above, or
  a member such as `<Ui.Row>`) is still checked: whether it compares props by
  identity is unknown, so the finding may not hold.

## Known False Negatives

- A fresh function produced by a call (`onSelect={debounce(() => …)}`,
  `onSelect={handler.bind(this)}`) is not followed.
