# no-redundant-should-component-update

> **Keywords:** React, shouldComponentUpdate, performance, PureComponent, optimization, ESLint rule, LLM-optimized

Prevent redundant `shouldComponentUpdate` implementations that just return `true`. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (dead code)                                                  |
| **Auto-Fix**   | ❌ No (requires review/removal)                                      |
| **Category**   | React                                                                |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | React class components                                               |

## Rule Details

A `shouldComponentUpdate` method that always returns `true` is redundant since that's React's default behavior. Remove it or implement meaningful comparison logic.

### Why This Matters

| Issue                         | Impact                              | Solution                        |
| ----------------------------- | ----------------------------------- | ------------------------------- |
| 🔄 **Dead code**              | Unnecessary method overhead         | Remove or implement logic       |
| 🐛 **False optimization**     | Misleading code intent              | Use PureComponent instead       |
| 🔍 **Maintenance burden**     | Code appears to do something        | Clean up redundant code         |

## Examples

### ❌ Incorrect

```tsx
class MyComponent extends React.Component {
  // BAD: Just returns true - this is default behavior!
  shouldComponentUpdate() {
    return true;
  }
  
  render() {
    return <div>{this.props.value}</div>;
  }
}

class AnotherComponent extends React.Component {
  // BAD: Also redundant
  shouldComponentUpdate(nextProps, nextState) {
    return true;
  }
}
```

### ✅ Correct

```tsx
// GOOD: No shouldComponentUpdate (uses default behavior)
class MyComponent extends React.Component {
  render() {
    return <div>{this.props.value}</div>;
  }
}

// GOOD: Meaningful implementation
class OptimizedComponent extends React.Component {
  shouldComponentUpdate(nextProps, nextState) {
    // Only re-render if value actually changed
    return nextProps.value !== this.props.value ||
           nextState.count !== this.state.count;
  }
}

// BETTER: Use PureComponent for shallow comparison
class PureComponent extends React.PureComponent {
  render() {
    return <div>{this.props.value}</div>;
  }
}

// BEST: Use functional component with React.memo
const MemoizedComponent = React.memo(function MyComponent({ value }) {
  return <div>{value}</div>;
});
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    '@forge-js/no-redundant-should-component-update': 'warn'
  }
}
```

## Related Rules

- [`require-optimization`](./require-optimization.md) - Optimization suggestions
- [`react-render-optimization`](./react-render-optimization.md) - Render performance

## Further Reading

- **[shouldComponentUpdate](https://react.dev/reference/react/Component#shouldcomponentupdate)** - React docs
- **[PureComponent](https://react.dev/reference/react/PureComponent)** - Automatic shallow comparison

