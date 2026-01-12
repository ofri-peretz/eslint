# no-unescaped-entities

> **Keywords:** React, JSX, entities, quotes, apostrophe, ESLint rule, HTML, LLM-optimized
**CWE:** [CWE-116](https://cwe.mitre.org/data/definitions/116.html)

Detect unescaped HTML entities in JSX. This rule is part of [`@eslint/eslint-plugin-react-features`](https://www.npmjs.com/package/@eslint/eslint-plugin-react-features).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Error (syntax)                                                       |
| **Auto-Fix**   | ✅ Yes (escapes entities)                                            |
| **Category**   | React                                                                |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | All React/JSX projects                                               |

## Rule Details

Characters like `>`, `"`, `'`, `}` have special meaning in JSX and must be escaped.

### Why This Matters

| Issue                     | Impact                          | Solution                  |
| ------------------------- | ------------------------------- | ------------------------- |
| ⚠️ **Syntax errors**      | JSX parsing fails               | Use HTML entities         |
| 📖 **Readability**        | Ambiguous characters            | Explicit escaping         |
| 🐛 **Silent failures**    | Wrong output                    | Proper encoding           |

## Examples

### ❌ Incorrect

```tsx
// Unescaped special characters
<div>5 > 3</div>
<div>It's working</div>
<div>Use "quotes"</div>
<div>Value: {value}</div>  // Unescaped } if not expression
```

### ✅ Correct

```tsx
// HTML entities
<div>5 &gt; 3</div>
<div>It&apos;s working</div>
<div>Use &quot;quotes&quot;</div>

// Or use JavaScript expressions
<div>{`5 > 3`}</div>
<div>{"It's working"}</div>
<div>{'Use "quotes"'}</div>
```

### Entity Reference

| Character | Entity       | Alternative      |
| --------- | ------------ | ---------------- |
| `>`       | `&gt;`       | `{'>'}` or `&#62;` |
| `<`       | `&lt;`       | `{'<'}` or `&#60;` |
| `"`       | `&quot;`     | `{'"'}` or `&#34;` |
| `'`       | `&apos;`     | `{"'"}` or `&#39;` |
| `}`       | `&#125;`     | `{'}'}`          |
| `{`       | `&#123;`     | `{'{'}`          |

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    'react-features/no-unescaped-entities': 'error'
  }
}
```

## Related Rules

- [`no-danger`](./no-danger.md) - HTML injection safety

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

- **[JSX In Depth](https://react.dev/learn/writing-markup-with-jsx)** - React docs
- **[HTML Entities](https://www.w3schools.com/html/html_entities.asp)** - Reference

