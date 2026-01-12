# no-this-in-sfc

> **Keywords:** React, this, stateless, functional component, hooks, SFC, ESLint rule, LLM-optimized
**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)

Disallow `this` from being used in stateless functional components. This rule is part of [`@eslint/eslint-plugin-react-features`](https://www.npmjs.com/package/@eslint/eslint-plugin-react-features).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Error (correctness)                                                  |
| **Auto-Fix**   | ❌ No (requires refactor)                                            |
| **Category**   | React                                                                |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | React functional components                                          |

## Rule Details

Using `this` in a functional component is always a bug. Functional components don't have a `this` context like class components do. This usually indicates code that should either be in a class component or refactored to use hooks.

### Why This Matters

| Issue                         | Impact                              | Solution                       |
| ----------------------------- | ----------------------------------- | ------------------------------ |
| 🔄 **undefined behavior**     | `this` is undefined in SFC          | Remove this usage              |
| 🐛 **Runtime errors**         | TypeError when accessing properties | Use hooks for state            |
| 🔍 **Confused intent**        | Code appears to be class component  | Convert to class or use hooks  |

## Examples

### ❌ Incorrect

```tsx
// BAD: Using 'this' in functional component
function UserCard(props) {
  // this is undefined or window - NOT what you want!
  const handleClick = () => {
    this.props.onClick();  // Error!
  };
  
  return (
    <div onClick={this.handleClick}>  // Error!
      {this.props.name}               // Error!
    </div>
  );
}

// BAD: Arrow function assigned to variable
const ProfileCard = (props) => {
  return (
    <div>
      {this.props.title}  // 'this' is wrong context!
    </div>
  );
};
```

### ✅ Correct

```tsx
// GOOD: Use props directly
function UserCard(props) {
  const handleClick = () => {
    props.onClick();
  };
  
  return (
    <div onClick={handleClick}>
      {props.name}
    </div>
  );
}

// GOOD: Use destructuring
function UserCard({ name, onClick }) {
  return (
    <div onClick={onClick}>
      {name}
    </div>
  );
}

// GOOD: Use hooks for state
function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <button onClick={() => setCount(c => c + 1)}>
      {count}
    </button>
  );
}

// If you need 'this', use a class component
class UserCard extends React.Component {
  handleClick = () => {
    this.props.onClick();  // 'this' is valid here
  };
  
  render() {
    return <div onClick={this.handleClick}>{this.props.name}</div>;
  }
}
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    'react-features/no-this-in-sfc': 'error'
  }
}
```

## Related Rules

- [`react-class-to-hooks`](./react-class-to-hooks.md) - Migration to hooks
- [`no-set-state`](./no-set-state.md) - Encourage functional components

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Values from Variables

**Why**: Static analysis cannot trace values stored in variables.

```typescript
// ❌ NOT DETECTED - Value from variable
const value = userInput;
dangerousOperation(value);
```

**Mitigation**: Implement runtime validation and review code manually.

### Custom Wrapper Functions

**Why**: Custom wrapper functions are not recognized.

```typescript
// ❌ NOT DETECTED - Custom wrapper
myCustomWrapper(sensitiveData); // Uses insecure API internally
```

**Mitigation**: Apply this rule's principles to wrapper function implementations.

### Dynamic Property Access

**Why**: Dynamic property access cannot be statically analyzed.

```typescript
// ❌ NOT DETECTED - Dynamic access
obj[methodName](data);
```

**Mitigation**: Avoid dynamic method invocation with sensitive operations.


## Further Reading

- **[Your First Component](https://react.dev/learn/your-first-component)** - React docs
- **[useState Hook](https://react.dev/reference/react/useState)** - State in functions

