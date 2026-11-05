---
title: no-did-mount-set-state
description: no-did-mount-set-state rule
tags: ['quality', 'react']
category: quality
autofix: suggestions
---


<!-- @rule-summary -->
no-did-mount-set-state rule
<!-- @/rule-summary -->

# no-did-mount-set-state

> **Keywords:** React, componentDidMount, setState, lifecycle, performance, ESLint rule, LLM-optimized

Prevent calling `setState` in `componentDidMount`. This rule is part of [`eslint-plugin-react-features`](https://www.npmjs.com/package/eslint-plugin-react-features).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (performance)                                                |
| **Auto-Fix**   | ❌ No (requires refactoring)                                         |
| **Category**   | React                                                                |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | React class components                                               |

## Rule Details

Calling `setState` immediately in `componentDidMount` causes an additional render cycle. Initial state should be set in the constructor or derived from props.

### Why This Matters

| Issue                         | Impact                              | Solution                     |
| ----------------------------- | ----------------------------------- | ---------------------------- |
| 🔄 **Double render**          | Performance degradation             | Set state in constructor     |
| 🐛 **Wasted cycles**          | Unnecessary DOM updates             | Use derived state            |
| 🔍 **Flicker**                | UI may flash between states         | Initialize state properly    |

## Examples

### ❌ Incorrect

```tsx
class UserProfile extends React.Component {
  state = { user: null };
  
  componentDidMount() {
    // BAD: Immediate setState causes extra render
    this.setState({ loading: true });
    
    // This is also problematic
    this.setState({
      windowWidth: window.innerWidth
    });
  }
}
```

### ✅ Correct

```tsx
class UserProfile extends React.Component {
  // GOOD: initial state is set up front, not in a second render
  state = { user: null, windowWidth: window.innerWidth };

  componentDidMount() {
    // GOOD: setState in a callback runs after the data arrives
    fetchUser(this.props.id).then((user) => this.setState({ user }));
  }
}
```

The rule reports a component's own `this.setState(…)` (also `this['setState']`) that runs synchronously in `componentDidMount` — declared as a method, an arrow property or a quoted key — on a class that extends React's `Component` / `PureComponent`, however it is imported. A call inside a callback (a promise handler, a timer) runs later and is not reported; neither is another object's `setState` (`store.setState(…)`).

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    'react-features/no-did-mount-set-state': 'warn'
  }
}
```

## Related Rules

- [`no-did-update-set-state`](./no-did-update-set-state.md) - Similar for componentDidUpdate
- [`react-class-to-hooks`](./react-class-to-hooks.md) - Migrate to hooks

## Further Reading

- **[componentDidMount](https://react.dev/reference/react/Component#componentdidmount)** - React docs
- **[State Initialization](https://react.dev/reference/react/Component#constructor)** - Constructor patterns

## Known False Negatives

- **`setState` reached through another method**: `componentDidMount() { this.load(); }` where `load` calls `this.setState` synchronously is not followed.
- **An alias of `this`**: `const self = this; self.setState(...)` is not read as the component's `setState`.
- **`createReactClass` components** are not covered; only classes that extend React's `Component` / `PureComponent`.

Not reported by design: `setState` inside a callback (`fetchData().then(...)`, a timer), which runs after mount.
