# no-console-spaces

> **Keywords:** console, logging, spaces, formatting, ESLint rule, auto-fix, LLM-optimized

Disallow leading/trailing whitespace in console arguments. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (code quality)                                               |
| **Auto-Fix**   | ✅ Yes (removes extra spaces)                                        |
| **Category**   | Development                                                          |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | Clean console output, consistent logging                             |

## Rule Details

Console methods automatically add spaces between arguments, so leading/trailing spaces in strings are redundant.

### Why This Matters

| Issue                     | Impact                          | Solution                  |
| ------------------------- | ------------------------------- | ------------------------- |
| 📝 **Double spaces**      | Inconsistent output             | Remove redundant spaces   |
| 🔍 **Log parsing**        | Affects log analysis            | Clean formatting          |
| 📖 **Readability**        | Cluttered logs                  | Trim strings              |

## Examples

### ❌ Incorrect

```typescript
// Leading/trailing spaces are redundant
console.log('Value: ', value);  // Double space in output
console.log(value, ' items');   // Double space in output
console.log(' Debug: ', data);  // Leading space unnecessary
```

### ✅ Correct

```typescript
// Console adds spaces automatically
console.log('Value:', value);
console.log(value, 'items');
console.log('Debug:', data);

// Or use template literals for exact control
console.log(`Value: ${value}`);
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    '@forge-js/no-console-spaces': 'warn'
  }
}
```

## Related Rules

- [`no-console-log`](./no-console-log.md) - Console logging control

## Further Reading

- **[Console API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Console)** - Console reference

