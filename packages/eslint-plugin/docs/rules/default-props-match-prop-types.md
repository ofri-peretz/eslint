# default-props-match-prop-types

> **Keywords:** React, defaultProps, propTypes, validation, type safety, ESLint rule, LLM-optimized

Validate that default props match their corresponding prop types. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (type safety)                                                |
| **Auto-Fix**   | ❌ No (requires manual review)                                       |
| **Category**   | React                                                                |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | React class components with PropTypes                                |

## Rule Details

Ensures that default prop values match the expected types defined in propTypes. Mismatched types can cause runtime errors or unexpected behavior.

### Why This Matters

| Issue                      | Impact                              | Solution                      |
| -------------------------- | ----------------------------------- | ----------------------------- |
| 🔄 **Type mismatch**       | Runtime errors                      | Match default to propType     |
| 🐛 **Silent failures**     | Unexpected component behavior       | Validate default values       |
| 🔍 **Debug difficulty**    | Hard to trace type issues           | Proper type alignment         |

## Examples

### ❌ Incorrect

```tsx
class UserCard extends React.Component {
  static propTypes = {
    name: PropTypes.string,
    count: PropTypes.number,
  };
  
  static defaultProps = {
    name: 42,        // Default is number, but propType is string!
    count: "zero",   // Default is string, but propType is number!
  };
}
```

### ✅ Correct

```tsx
class UserCard extends React.Component {
  static propTypes = {
    name: PropTypes.string,
    count: PropTypes.number,
  };
  
  static defaultProps = {
    name: "Guest",   // String matches string propType
    count: 0,        // Number matches number propType
  };
}

// Better: Use TypeScript for static type checking
interface Props {
  name?: string;
  count?: number;
}

function UserCard({ name = "Guest", count = 0 }: Props) {
  return <div>{name}: {count}</div>;
}
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    '@forge-js/default-props-match-prop-types': 'warn'
  }
}
```

## Related Rules

- [`prop-types`](./prop-types.md) - Enforce prop types usage
- [`require-default-props`](./require-default-props.md) - Require default props

## Further Reading

- **[Typechecking With PropTypes](https://react.dev/reference/react/Component#static-proptypes)** - React docs
- **[Default Props](https://react.dev/learn/passing-props-to-a-component#specifying-default-values-for-props)** - Default values

