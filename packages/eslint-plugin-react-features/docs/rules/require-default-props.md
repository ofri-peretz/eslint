# require-default-props

> **Keywords:** React, defaultProps, optional props, type safety, component API, ESLint rule, LLM-optimized
**CWE:** [CWE-494](https://cwe.mitre.org/data/definitions/494.html)

Require default props for optional props. This rule is part of [`@eslint/eslint-plugin-react-features`](https://www.npmjs.com/package/@eslint/eslint-plugin-react-features).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (robustness)                                                 |
| **Auto-Fix**   | ❌ No (requires default values)                                      |
| **Category**   | React                                                                |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | React components with optional props                                 |

## Rule Details

Non-required props should have corresponding default values in `defaultProps`. This ensures predictable component behavior when props are omitted.

### Why This Matters

| Issue                         | Impact                              | Solution                     |
| ----------------------------- | ----------------------------------- | ---------------------------- |
| 🔄 **Undefined props**        | `undefined` passed to children      | Define defaultProps          |
| 🐛 **Conditional rendering**  | Extra null checks needed            | Guaranteed values            |
| 🔍 **Component API**          | Unclear expected behavior           | Defaults document intent     |

## Examples

### ❌ Incorrect

```tsx
import PropTypes from 'prop-types';

// BAD: Optional props without defaults
class Button extends React.Component {
  static propTypes = {
    label: PropTypes.string.isRequired,
    variant: PropTypes.string,     // Optional but no default!
    size: PropTypes.string,        // Optional but no default!
    disabled: PropTypes.bool,      // Optional but no default!
  };
  
  render() {
    // Need null checks everywhere
    const { label, variant, size, disabled } = this.props;
    return (
      <button 
        className={variant ? `btn-${variant}` : 'btn-default'}
        disabled={disabled ?? false}
      >
        {label}
      </button>
    );
  }
}
```

### ✅ Correct

```tsx
import PropTypes from 'prop-types';

// GOOD: All optional props have defaults
class Button extends React.Component {
  static propTypes = {
    label: PropTypes.string.isRequired,
    variant: PropTypes.string,
    size: PropTypes.string,
    disabled: PropTypes.bool,
  };
  
  static defaultProps = {
    variant: 'primary',
    size: 'medium',
    disabled: false,
  };
  
  render() {
    // No null checks needed - values guaranteed
    const { label, variant, size, disabled } = this.props;
    return (
      <button className={`btn-${variant} btn-${size}`} disabled={disabled}>
        {label}
      </button>
    );
  }
}

// BETTER: Functional component with default parameters
function Button({
  label,
  variant = 'primary',
  size = 'medium',
  disabled = false,
}) {
  return (
    <button className={`btn-${variant} btn-${size}`} disabled={disabled}>
      {label}
    </button>
  );
}

Button.propTypes = {
  label: PropTypes.string.isRequired,
  variant: PropTypes.string,
  size: PropTypes.string,
  disabled: PropTypes.bool,
};
```

## Options

| Option                    | Type    | Default | Description                              |
| ------------------------- | ------- | ------- | ---------------------------------------- |
| `forbidDefaultForRequired`| boolean | `false` | Error if required prop has default       |

### Configuration with Options

```javascript
{
  rules: {
    'react-features/require-default-props': ['warn', {
      forbidDefaultForRequired: true  // Flag unnecessary defaults
    }]
  }
}
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    'react-features/require-default-props': 'warn'
  }
}
```

## Related Rules

- [`prop-types`](./prop-types.md) - Enforce PropTypes
- [`default-props-match-prop-types`](./default-props-match-prop-types.md) - Type consistency

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

- **[Default Props](https://react.dev/learn/passing-props-to-a-component#specifying-default-values-for-props)** - React docs
- **[PropTypes Validation](https://react.dev/reference/react/Component#static-proptypes)** - Type checking

