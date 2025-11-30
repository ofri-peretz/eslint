# require-default-props

> **Keywords:** React, defaultProps, optional props, type safety, component API, ESLint rule, LLM-optimized

Require default props for optional props. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized).

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
    '@forge-js/require-default-props': ['warn', {
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
    '@forge-js/require-default-props': 'warn'
  }
}
```

## Related Rules

- [`prop-types`](./prop-types.md) - Enforce PropTypes
- [`default-props-match-prop-types`](./default-props-match-prop-types.md) - Type consistency

## Further Reading

- **[Default Props](https://react.dev/learn/passing-props-to-a-component#specifying-default-values-for-props)** - React docs
- **[PropTypes Validation](https://react.dev/reference/react/Component#static-proptypes)** - Type checking

