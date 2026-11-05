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

```tsx
class UserCard extends React.Component {
  static propTypes = { name: PropTypes.string };
  static getDerivedStateFromProps() {
    return null;
  }
  // BAD: the propTypes group resumes after the lifecycle group
  static defaultProps = { name: 'Guest' };
}
```

A group is broken when one of its statics comes after a static of a different
group that followed the first. A static in no group never breaks one. Names
are read in every spelling (`static ['defaultProps']`), and the class must
extend React's `Component` or `PureComponent`, by binding.

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
| `propertyGroups` | array    | See defaults     | Property groups; replaces the default groups |
| `childClass`     | string   | `'first'`        | Accepted for compatibility; it has no effect |

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

- Statics assigned after the class (`Card.propTypes = …`) are not checked.
- A static in no group never breaks a group.
