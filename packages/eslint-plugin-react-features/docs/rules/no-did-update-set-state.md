---
title: no-did-update-set-state
description: no-did-update-set-state rule
tags: ['quality', 'react']
category: quality
autofix: suggestions
---


<!-- @rule-summary -->
no-did-update-set-state rule
<!-- @/rule-summary -->

# no-did-update-set-state

> **Keywords:** React, componentDidUpdate, setState, infinite loop, lifecycle, ESLint rule, LLM-optimized

Prevent calling `setState` in `componentDidUpdate` without a conditional. This rule is part of [`eslint-plugin-react-features`](https://www.npmjs.com/package/eslint-plugin-react-features).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Error (correctness)                                                  |
| **Auto-Fix**   | ❌ No (requires conditional logic)                                   |
| **Category**   | React                                                                |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | React class components                                               |

## Rule Details

Calling `setState` unconditionally in `componentDidUpdate` creates an infinite render loop. Always wrap `setState` calls in a condition that compares previous and current props/state.

### Why This Matters

| Issue                         | Impact                              | Solution                        |
| ----------------------------- | ----------------------------------- | ------------------------------- |
| 🔄 **Infinite loop**          | Application crash                   | Add conditional check           |
| 🐛 **Performance**            | Excessive re-renders                | Compare prev/current values     |
| 🔍 **Memory leak**            | Growing call stack                  | Proper update conditions        |

## Examples

### ❌ Incorrect

```tsx
class UserProfile extends React.Component {
  componentDidUpdate() {
    // BAD: Unconditional setState causes infinite loop!
    this.setState({ updated: true });
  }
  
  componentDidUpdate(prevProps) {
    // BAD: No condition check
    this.setState({ user: this.props.userId });
  }
}
```

### ✅ Correct

```tsx
class UserProfile extends React.Component {
  componentDidUpdate(prevProps, prevState) {
    // GOOD: Conditional check prevents infinite loop
    if (prevProps.userId !== this.props.userId) {
      this.setState({ user: null, loading: true });
      this.fetchUser(this.props.userId);
    }
    
    // GOOD: Check state changes too
    if (prevState.count !== this.state.count) {
      this.updateAnalytics(this.state.count);
    }
  }
}

// Better: Use functional components with hooks
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId]); // Dependency array handles the condition
}
```

## Options

| Option            | Type    | Default | Description                           |
| ----------------- | ------- | ------- | ------------------------------------- |
| `allowInCallback` | boolean | `false` | Allow setState inside async callbacks |

### Configuration with Options

```javascript
{
  rules: {
    'react-features/no-did-update-set-state': ['error', {
      allowInCallback: true
    }]
  }
}
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    'react-features/no-did-update-set-state': 'error'
  }
}
```

## Related Rules

- [`no-did-mount-set-state`](./no-did-mount-set-state.md) - Similar for componentDidMount
- [`react-class-to-hooks`](./react-class-to-hooks.md) - Migrate to hooks

## Further Reading

- **[componentDidUpdate](https://react.dev/reference/react/Component#componentdidupdate)** - React docs
- **[Infinite Loop Prevention](https://react.dev/learn/you-might-not-need-an-effect)** - Effect patterns

## Known False Negatives

- **Any condition counts as a guard**: `if (true) this.setState(...)` or a condition that never changes is not analysed; only the absence of a condition is reported.
- **`setState` reached through another method** (`componentDidUpdate() { this.sync(); }`) is not followed.
- **An alias of `this`** (`const self = this; self.setState(...)`) is not read as the component's `setState`.
