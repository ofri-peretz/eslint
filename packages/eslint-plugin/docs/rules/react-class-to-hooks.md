# react-class-to-hooks

> **Keywords:** React, hooks, migration, ESLint rule, class components, functional components, React modernization, auto-fix, LLM-optimized, React migration

Suggest migrating React class components to hooks with detailed migration path. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized) and provides LLM-optimized error messages with fix suggestions.

**💡 Provides suggestions** | **🔧 Automatically fixable**

## Quick Summary

| Aspect | Details |
|--------|---------|
| **Severity** | Warning (migration guidance) |
| **Auto-Fix** | ✅ Yes (suggests hooks migration) |
| **Category** | React / Migration |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration |
| **Best For** | React projects migrating from class to functional components |

## Rule Details

Identifies React class components that can be migrated to functional components with hooks, providing complexity analysis and migration guidance.

## Configuration

| Option                       | Type      | Default | Description                                        |
| ---------------------------- | --------- | ------- | -------------------------------------------------- |
| `ignorePureRenderComponents` | `boolean` | `false` | Ignore PureComponent classes                       |
| `allowComplexLifecycle`      | `boolean` | `false` | Allow complex lifecycle methods without warnings   |

## Examples

### ❌ Class Component

```typescript
class UserProfile extends React.Component<Props, State> {
  state = {
    loading: false,
    data: null
  };
  
  componentDidMount() {
    this.fetchData();
  }
  
  fetchData = async () => {
    this.setState({ loading: true });
    const data = await api.getUser(this.props.userId);
    this.setState({ data, loading: false });
  };
  
  render() {
    const { loading, data } = this.state;
    return loading ? <Spinner /> : <div>{data?.name}</div>;
  }
}
```

### ✅ Functional Component with Hooks

```typescript
function UserProfile({ userId }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<User | null>(null);
  
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const userData = await api.getUser(userId);
      setData(userData);
      setLoading(false);
    }
    fetchData();
  }, [userId]);
  
  return loading ? <Spinner /> : <div>{data?.name}</div>;
}
```

## Configuration Examples

```javascript
{
  rules: {
    '@forge-js/react-class-to-hooks': ['warn', {
      ignorePureRenderComponents: false,
      allowComplexLifecycle: false
    }]
  }
}
```

## Lifecycle Method Mapping

| Class Lifecycle              | Hook Equivalent                           |
| ---------------------------- | ----------------------------------------- |
| `componentDidMount`          | `useEffect(() => {}, [])`                 |
| `componentDidUpdate`         | `useEffect(() => {}, [deps])`             |
| `componentWillUnmount`       | `useEffect(() => () => {}, [])`           |
| `shouldComponentUpdate`      | `React.memo()`                            |
| `getDerivedStateFromProps`   | `useState` + `useEffect`                  |

## Comparison with Alternatives

| Feature | react-class-to-hooks | eslint-plugin-react-hooks | codemods |
|---------|---------------------|--------------------------|----------|
| **Class Detection** | ✅ Yes | ❌ No | ✅ Yes |
| **Migration Suggestions** | ✅ Yes | ❌ No | ⚠️ Automated only |
| **Auto-Fix** | ✅ Yes | ❌ No | ✅ Yes |
| **LLM-Optimized** | ✅ Yes | ❌ No | ❌ No |
| **ESLint MCP** | ✅ Optimized | ❌ No | ❌ No |
| **Complexity Analysis** | ✅ Yes | ❌ No | ❌ No |

## Related Rules

- [`react-no-inline-functions`](./react-no-inline-functions.md) - Performance optimization
- [`required-attributes`](./required-attributes.md) - React attribute enforcement
- [`no-deprecated-api`](./no-deprecated-api.md) - API modernization

## Further Reading

- **[React Hooks Documentation](https://react.dev/reference/react)** - React hooks reference
- **[Migrating from Classes to Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)** - Migration guide
- **[React Codemods](https://github.com/reactjs/react-codemod)** - Automated migration tools
- **[ESLint MCP Setup](https://eslint.org/docs/latest/use/mcp)** - Enable AI assistant integration

