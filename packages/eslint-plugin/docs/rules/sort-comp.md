# sort-comp

> **Keywords:** React, component methods, ordering, lifecycle, code organization, ESLint rule, LLM-optimized

Enforce component method ordering in React class components. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (organization)                                               |
| **Auto-Fix**   | ❌ No (requires reordering)                                          |
| **Category**   | React                                                                |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | React class components with consistent style                         |

## Rule Details

Enforces a consistent ordering of methods within React class components, making code more predictable and easier to navigate.

### Why This Matters

| Issue                         | Impact                              | Solution                     |
| ----------------------------- | ----------------------------------- | ---------------------------- |
| 🔄 **Inconsistent structure** | Hard to find methods                | Standardized ordering        |
| 🐛 **Review difficulty**      | Different patterns across team      | Consistent conventions       |
| 🔍 **Onboarding**             | New devs struggle to navigate       | Predictable structure        |

## Default Order

1. `static-variables` - Static class properties
2. `static-methods` - Static methods
3. `instance-variables` - Instance properties
4. `lifecycle` - React lifecycle methods
5. `everything-else` - Custom methods
6. `render` - The render method (always last)

### Lifecycle Methods Order

Within the `lifecycle` group, methods follow React's lifecycle order:
- `constructor`
- `getDerivedStateFromProps`
- `componentDidMount`
- `shouldComponentUpdate`
- `componentDidUpdate`
- `componentWillUnmount`

## Examples

### ❌ Incorrect

```tsx
class UserProfile extends React.Component {
  // BAD: render before lifecycle
  render() {
    return <div>{this.state.name}</div>;
  }
  
  // BAD: lifecycle after render
  componentDidMount() {
    this.fetchUser();
  }
  
  // BAD: constructor not first
  constructor(props) {
    super(props);
    this.state = { name: '' };
  }
  
  // BAD: static after instance methods
  static propTypes = {
    userId: PropTypes.string.isRequired
  };
}
```

### ✅ Correct

```tsx
class UserProfile extends React.Component {
  // 1. Static properties
  static propTypes = {
    userId: PropTypes.string.isRequired
  };
  
  static defaultProps = {
    userId: ''
  };
  
  // 2. Instance properties
  state = { name: '', loading: true };
  
  // 3. Lifecycle methods (in React lifecycle order)
  constructor(props) {
    super(props);
    this.handleSubmit = this.handleSubmit.bind(this);
  }
  
  componentDidMount() {
    this.fetchUser();
  }
  
  componentDidUpdate(prevProps) {
    if (prevProps.userId !== this.props.userId) {
      this.fetchUser();
    }
  }
  
  componentWillUnmount() {
    this.abortController.abort();
  }
  
  // 4. Custom methods
  fetchUser = async () => {
    const user = await api.getUser(this.props.userId);
    this.setState({ name: user.name, loading: false });
  };
  
  handleSubmit = () => {
    // ...
  };
  
  // 5. Render (always last)
  render() {
    if (this.state.loading) return <Spinner />;
    return <div>{this.state.name}</div>;
  }
}
```

## Options

| Option   | Type     | Default          | Description                       |
| -------- | -------- | ---------------- | --------------------------------- |
| `order`  | string[] | See default order| Array of group names in order     |
| `groups` | object   | `{}`             | Custom group definitions          |

### Configuration with Options

```javascript
{
  rules: {
    '@forge-js/sort-comp': ['warn', {
      order: [
        'static-variables',
        'static-methods',
        'instance-variables',
        'lifecycle',
        'event-handlers',
        'getters',
        'everything-else',
        'render'
      ],
      groups: {
        'event-handlers': [
          '/^handle.+$/',
          '/^on.+$/'
        ]
      }
    }]
  }
}
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    '@forge-js/sort-comp': 'warn'
  }
}
```

## Related Rules

- [`prefer-stateless-function`](./prefer-stateless-function.md) - Functional components
- [`state-in-constructor`](./state-in-constructor.md) - State initialization

## Further Reading

- **[Component Lifecycle](https://react.dev/reference/react/Component)** - React docs
- **[Class Components](https://react.dev/reference/react/Component#defining-a-class-component)** - Structure

