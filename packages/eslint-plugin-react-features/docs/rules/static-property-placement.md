---
title: static-property-placement
description: static-property-placement rule
tags: ['quality', 'react']
category: quality
autofix: suggestions
---


<!-- @rule-summary -->
static-property-placement rule
<!-- @/rule-summary -->

# static-property-placement

> **Keywords:** React, static properties, propTypes, defaultProps, organization, ESLint rule, LLM-optimized

Enforce static property placement in React class components. This rule is part of [`eslint-plugin-react-features`](https://www.npmjs.com/package/eslint-plugin-react-features).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (organization)                                               |
| **Auto-Fix**   | ❌ No (requires reordering)                                          |
| **Category**   | React                                                                |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | React class components with consistent structure                     |

## Rule Details

Enforces consistent placement and grouping of static properties like `propTypes`, `defaultProps`, `contextTypes`, and lifecycle static methods.

### Why This Matters

| Issue                         | Impact                              | Solution                     |
| ----------------------------- | ----------------------------------- | ---------------------------- |
| 🔄 **Scattered statics**      | Properties hard to find             | Group together               |
| 🐛 **Inconsistent placement** | Different patterns across codebase  | Standardize location         |
| 🔍 **Review difficulty**      | Time wasted searching               | Predictable structure        |

## Default Property Groups

| Group Name  | Properties                                                              |
| ----------- | ----------------------------------------------------------------------- |
| `propTypes` | `propTypes`, `defaultProps`, `childContextTypes`, `contextTypes`, `contextType` |
| `lifecycle` | `getDerivedStateFromProps`, `getDerivedStateFromError`                  |

## Examples

### ❌ Incorrect

> _Awaiting a tested example. The previous snippet was removed because the rule does not behave as the doc claimed; track the regression in [`benchmarks/FP_FN_REMEDIATION_TRACKER.md`](../../../../benchmarks/FP_FN_REMEDIATION_TRACKER.md)._

### ✅ Correct

```tsx
class UserCard extends React.Component {
  // GOOD: All prop-related statics grouped together
  static propTypes = {
    name: PropTypes.string.isRequired,
    email: PropTypes.string,
  };
  
  static defaultProps = {
    name: 'Guest',
    email: '',
  };
  
  static contextTypes = {
    theme: PropTypes.object
  };
  
  // GOOD: Lifecycle statics grouped together
  static getDerivedStateFromProps(props, state) {
    if (props.name !== state.prevName) {
      return { name: props.name, prevName: props.name };
    }
    return null;
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  
  // Instance properties after statics
  state = { loading: true, name: '' };
  
  componentDidMount() {
    this.fetchData();
  }
  
  render() {
    return <div>{this.state.name}</div>;
  }
}

// BETTER: Use functional components
function UserCard({ name = 'Guest', email = '' }) {
  const theme = useContext(ThemeContext);
  return <div style={theme}>{name}</div>;
}

UserCard.propTypes = {
  name: PropTypes.string,
  email: PropTypes.string,
};
```

## Options

| Option           | Type     | Default          | Description                       |
| ---------------- | -------- | ---------------- | --------------------------------- |
| `propertyGroups` | array    | See defaults     | Define property groups            |
| `childClass`     | string   | `'first'`        | Where to place in subclasses      |

### Configuration with Options

```javascript
{
  rules: {
    'react-features/static-property-placement': ['warn', {
      propertyGroups: [
        {
          name: 'propTypes',
          properties: ['propTypes', 'defaultProps', 'contextTypes']
        },
        {
          name: 'lifecycle',
          properties: ['getDerivedStateFromProps', 'getDerivedStateFromError']
        },
        {
          name: 'custom',
          properties: ['displayName', 'navigationOptions']
        }
      ],
      childClass: 'first'
    }]
  }
}
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    'react-features/static-property-placement': 'warn'
  }
}
```

## Related Rules

- [`sort-comp`](./sort-comp.md) - Method ordering
- [`prop-types`](./prop-types.md) - Enforce PropTypes

## Further Reading

- **[Static Properties](https://react.dev/reference/react/Component#static-properties)** - React docs
- **[Class Fields](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Public_class_fields)** - MDN
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

### Imported Values

**Why**: When values come from imports, the rule cannot analyze their origin or construction.

```typescript
// ❌ NOT DETECTED - Value from import
import { getValue } from './helpers';
processValue(getValue()); // Cross-file not tracked
```

**Mitigation**: Ensure imported values follow the same constraints. Use TypeScript for type safety.