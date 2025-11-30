# prop-types

> **Keywords:** React, PropTypes, validation, type checking, runtime validation, ESLint rule, LLM-optimized

Enforce prop types validation for React components. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (type safety)                                                |
| **Auto-Fix**   | ❌ No (requires prop type definitions)                               |
| **Category**   | React                                                                |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | JavaScript React projects (TypeScript preferred)                     |

## Rule Details

Components should have PropTypes defined to provide runtime type checking. This helps catch bugs during development and serves as documentation.

### Why This Matters

| Issue                         | Impact                              | Solution                     |
| ----------------------------- | ----------------------------------- | ---------------------------- |
| 🔄 **No type safety**         | Runtime errors from wrong props     | Define PropTypes             |
| 🐛 **Poor documentation**     | Unclear component API               | PropTypes document interface |
| 🔍 **Debug difficulty**       | Silent failures with wrong types    | Runtime warnings in dev      |

## Examples

### ❌ Incorrect

```tsx
// BAD: No PropTypes defined
class UserCard extends React.Component {
  render() {
    return (
      <div>
        <h1>{this.props.name}</h1>
        <p>{this.props.email}</p>
      </div>
    );
  }
}
```

### ✅ Correct

```tsx
import PropTypes from 'prop-types';

// GOOD: PropTypes defined
class UserCard extends React.Component {
  static propTypes = {
    name: PropTypes.string.isRequired,
    email: PropTypes.string.isRequired,
    age: PropTypes.number,
    role: PropTypes.oneOf(['admin', 'user', 'guest']),
    onUpdate: PropTypes.func,
  };
  
  static defaultProps = {
    age: 0,
    role: 'user',
  };
  
  render() {
    const { name, email, age, role } = this.props;
    return (
      <div>
        <h1>{name}</h1>
        <p>{email}</p>
      </div>
    );
  }
}

// BETTER: Use TypeScript instead
interface UserCardProps {
  name: string;
  email: string;
  age?: number;
  role?: 'admin' | 'user' | 'guest';
  onUpdate?: () => void;
}

function UserCard({ name, email, age = 0, role = 'user' }: UserCardProps) {
  return (
    <div>
      <h1>{name}</h1>
      <p>{email}</p>
    </div>
  );
}
```

## Options

| Option             | Type     | Default | Description                              |
| ------------------ | -------- | ------- | ---------------------------------------- |
| `ignore`           | string[] | `[]`    | Component names to ignore                |
| `customValidators` | string[] | `[]`    | Custom validator function names          |
| `skipUndeclared`   | boolean  | `false` | Skip if no props are accessed            |

### Configuration with Options

```javascript
{
  rules: {
    '@forge-js/prop-types': ['warn', {
      ignore: ['Link', 'Router'],           // Third-party components
      customValidators: ['customPropType'], // Custom validators
      skipUndeclared: true                  // Skip components not using props
    }]
  }
}
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    '@forge-js/prop-types': 'warn'
  }
}
```

### Strict Usage

```javascript
{
  rules: {
    '@forge-js/prop-types': 'error'
  }
}
```

## Related Rules

- [`default-props-match-prop-types`](./default-props-match-prop-types.md) - Type consistency
- [`require-default-props`](./require-default-props.md) - Default values

## Further Reading

- **[PropTypes](https://react.dev/reference/react/Component#static-proptypes)** - React docs
- **[TypeScript with React](https://react.dev/learn/typescript)** - Modern alternative

