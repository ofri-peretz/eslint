# no-children-prop

> **Keywords:** React, children, props, composition, ESLint rule, best practices, LLM-optimized

Prevent passing `children` as a prop. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized).

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
    '@forge-js/no-children-prop': 'warn'
  }
}
```

## Related Rules

- [`jsx-key`](./jsx-key.md) - Keys in children lists

## Further Reading

- **[Composition vs Inheritance](https://react.dev/learn/passing-props-to-a-component)** - React docs

