# static-property-placement

> **Keywords:** React, static properties, propTypes, defaultProps, organization, ESLint rule, LLM-optimized

Enforce static property placement in React class components. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized).

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
  state = { loading: true };
  
  // BAD: Static properties scattered throughout class
  static propTypes = {
    name: PropTypes.string.isRequired
  };
  
  componentDidMount() {
    this.fetchData();
  }
  
  // BAD: defaultProps far from propTypes
  static defaultProps = {
    name: 'Guest'
  };
  
  static getDerivedStateFromProps(props, state) {
    return { name: props.name };
  }
  
  // BAD: contextTypes separated from related statics
  static contextTypes = {
    theme: PropTypes.object
  };
  
  render() {
    return <div>{this.props.name}</div>;
  }
}
```

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
    '@forge-js/static-property-placement': ['warn', {
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
    '@forge-js/static-property-placement': 'warn'
  }
}
```

## Related Rules

- [`sort-comp`](./sort-comp.md) - Method ordering
- [`prop-types`](./prop-types.md) - Enforce PropTypes

## Further Reading

- **[Static Properties](https://react.dev/reference/react/Component#static-properties)** - React docs
- **[Class Fields](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Public_class_fields)** - MDN

