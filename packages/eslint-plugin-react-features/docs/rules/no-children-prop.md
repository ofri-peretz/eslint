# no-children-prop

> **Keywords:** React, children, props, composition, ESLint rule, best practices, LLM-optimized
**CWE:** [CWE-693](https://cwe.mitre.org/data/definitions/693.html)

Prevent passing `children` as a prop. This rule is part of [`@eslint/eslint-plugin-react-features`](https://www.npmjs.com/package/@eslint/eslint-plugin-react-features).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (style)                                                      |
| **Auto-Fix**   | ❌ No (requires restructuring)                                       |
| **Category**   | React                                                                |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | Consistent JSX patterns                                              |

## Rule Details

Passing `children` as a prop instead of nesting is less readable and can cause issues.

### Why This Matters

| Issue                     | Impact                          | Solution                  |
| ------------------------- | ------------------------------- | ------------------------- |
| 📖 **Readability**        | Less intuitive structure        | Use nested children       |
| 🔄 **Consistency**        | Mixed patterns                  | Standardize               |
| 🐛 **Edge cases**         | Prop overwrite issues           | Natural nesting           |

## Examples

### ❌ Incorrect

```tsx
<Component children={<span>Hello</span>} />
<Component children="Hello" />
<Component children={[<span key="1">A</span>, <span key="2">B</span>]} />
```

### ✅ Correct

```tsx
<Component>
  <span>Hello</span>
</Component>

<Component>Hello</Component>

<Component>
  <span key="1">A</span>
  <span key="2">B</span>
</Component>
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    'react-features/no-children-prop': 'warn'
  }
}
```

## Related Rules

- [`jsx-key`](./jsx-key.md) - Keys in children lists

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

- **[Composition vs Inheritance](https://react.dev/learn/passing-props-to-a-component)** - React docs

