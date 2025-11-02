# react-no-inline-functions

Prevent inline functions in React renders with performance metrics.

**💡 Provides suggestions** | **🔧 Automatically fixable**

## Rule Details

Detects inline functions in React JSX that cause unnecessary re-renders, providing performance impact analysis.

## Configuration

| Option                  | Type      | Default | Description                                       |
| ----------------------- | --------- | ------- | ------------------------------------------------- |
| `allowInEventHandlers`  | `boolean` | `false` | Allow inline functions in event handlers          |
| `minArraySize`          | `number`  | `10`    | Minimum array size to report inline functions in `.map()` |

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
  const handleDelete = useCallback((todoId: string) => {
    deleteTodo(todoId);
  }, []);
  
  return (
    <div>
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onDelete={() => handleDelete(todo.id)}  // ✅ Using useCallback
        />
      ))}
    </div>
  );
}
```

## Configuration Examples

```javascript
{
  rules: {
    '@forge-js/react-no-inline-functions': ['warn', {
      allowInEventHandlers: true,  // Allow simple event handlers
      minArraySize: 5              // Only warn for large lists
    }]
  }
}
```

## Performance Impact

| Array Size | Re-renders | Impact  |
| ---------- | ---------- | ------- |
| 1-10       | Low        | 🟢 Minor |
| 11-100     | Medium     | 🟡 Moderate |
| 100+       | High       | 🔴 Significant |

## Related Rules

- [`react-class-to-hooks`](./react-class-to-hooks.md) - Migration to hooks

