# no-insecure-comparison

> **Keywords:** insecure comparison, CWE-697, security, ESLint rule, loose equality, type coercion, == vs ===, strict equality, JavaScript security, auto-fix, LLM-optimized, code security

Detects insecure comparison operators (`==`, `!=`) that can lead to type coercion vulnerabilities. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized) and provides LLM-optimized error messages that AI assistants can automatically fix.

⚠️ This rule **_warns_** by default in the `recommended` config.

## Quick Summary

| Aspect            | Details                                                                          |
| ----------------- | -------------------------------------------------------------------------------- |
| **CWE Reference** | CWE-697 (Incorrect Comparison)                                                   |
| **Severity**      | High (security vulnerability)                                                  |
| **Auto-Fix**      | ✅ Yes (replaces == with ===, != with !==)                                       |
| **Category**      | Security                                                                         |
| **ESLint MCP**    | ✅ Optimized for ESLint MCP integration                                          |
| **Best For**      | All JavaScript/TypeScript applications, especially security-sensitive code     |

## Rule Details

Insecure comparison operators (`==`, `!=`) use type coercion, which can lead to unexpected behavior and security vulnerabilities. This rule enforces strict equality (`===`, `!==`) which compares both value and type.

### Why This Matters

| Issue                 | Impact                              | Solution                   |
| --------------------- | ----------------------------------- | -------------------------- |
| 🔒 **Security**       | Type coercion can bypass checks    | Use strict equality (===)  |
| 🐛 **Bugs**           | Unexpected type conversions         | Compare type and value     |
| 🔐 **Reliability**    | Hard-to-debug issues                | Predictable comparisons    |
| 📊 **Best Practice**  | Violates JavaScript best practices  | Always use strict equality |

## Detection Patterns

The rule detects:

- **Loose equality**: `==` operator
- **Loose inequality**: `!=` operator

## Examples

### ❌ Incorrect

```typescript
// Insecure comparison with type coercion
if (user.id == userId) { // ❌ Type coercion
  // Process user
}

// Insecure inequality
if (value != null) { // ❌ Type coercion
  // Handle value
}

// Ternary with loose equality
const result = a == b ? 1 : 0; // ❌ Type coercion
```

### ✅ Correct

```typescript
// Strict equality - no type coercion
if (user.id === userId) { // ✅ Type and value match
  // Process user
}

// Strict inequality
if (value !== null && value !== undefined) { // ✅ Explicit checks
  // Handle value
}

// Ternary with strict equality
const result = a === b ? 1 : 0; // ✅ Type and value match
```

## Configuration

### Default Configuration

```json
{
  "@forge-js/llm-optimized/security/no-insecure-comparison": "warn"
}
```

### Options

| Option          | Type      | Default                          | Description                        |
| --------------- | --------- | -------------------------------- | ----------------------------------- |
| `allowInTests`  | `boolean` | `false`                          | Allow insecure comparison in tests  |
| `ignorePatterns`| `string[]`| `[]`                             | Additional patterns to ignore       |

### Example Configuration

```json
{
  "@forge-js/llm-optimized/security/no-insecure-comparison": [
    "warn",
    {
      "allowInTests": true,
      "ignorePatterns": ["x == y"]
    }
  ]
}
```

## Best Practices

1. **Always use strict equality** (`===`, `!==`) for all comparisons
2. **Explicit null checks**: Use `value !== null && value !== undefined` instead of `value != null`
3. **Type safety**: Strict equality prevents accidental type coercion bugs
4. **Consistency**: Use strict equality throughout the codebase

## Related Rules

- [`no-unvalidated-user-input`](./no-unvalidated-user-input.md) - Detects unvalidated user input
- [`no-privilege-escalation`](./no-privilege-escalation.md) - Detects privilege escalation vulnerabilities

## Resources

- [CWE-697: Incorrect Comparison](https://cwe.mitre.org/data/definitions/697.html)
- [MDN: Equality comparisons and sameness](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Equality_comparisons_and_sameness)
- [JavaScript Equality Table](https://dorey.github.io/JavaScript-Equality-Table/)

