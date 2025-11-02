# react-class-to-hooks

Suggest migrating React class components to hooks with detailed migration path.

**💡 Provides suggestions** | **🔧 Automatically fixable**

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

## Related Rules

- [`react-no-inline-functions`](./react-no-inline-functions.md) - Performance optimization

