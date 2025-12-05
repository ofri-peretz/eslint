# no-improper-type-validation

> **Keywords:** type validation, CWE-1287, type confusion, typeof, instanceof, security

Detects improper type validation in user input handling. This rule is part of [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding).

⚠️ This rule is set to **warning** in the `recommended` config.

## Quick Summary

| Aspect | Details |
|--------|---------|
| **CWE Reference** | CWE-1287 (Improper Validation of Specified Type of Input) |
| **Severity** | Medium (CVSS 5.3) |
| **Auto-Fix** | 💡 Suggestions available |
| **Category** | Input Validation & XSS |

## Rule Details

Improper type validation can lead to security vulnerabilities when user input is not properly validated. Attackers can bypass security checks using:
- Type coercion tricks
- Prototype pollution
- `null` value confusion
- Cross-realm `instanceof` failures

### Why This Matters

| Issue | Impact | Solution |
|-------|--------|----------|
| 🔓 **Bypass** | Security control evasion | Use proper type guards |
| 🎭 **Confusion** | Unexpected behavior | Validate with schema libraries |
| 💥 **Crash** | Denial of service | Check for null/undefined |

## Examples

### ❌ Incorrect

```typescript
// typeof null returns 'object'
if (typeof userInput === 'object') {
  userInput.method(); // Crashes if null!
}

// instanceof can be bypassed across realms
if (userInput instanceof Array) {
  // May fail for arrays from iframes
}

// Loose equality type coercion
if (userInput == true) {
  // '1', 1, [1], ['1'] all pass!
}

// Missing null check
function process(data: object) {
  if (typeof data === 'object') {
    return data.id; // Fails if data is null
  }
}
```

### ✅ Correct

```typescript
// Check for null explicitly
if (userInput !== null && typeof userInput === 'object') {
  userInput.method();
}

// Use Array.isArray() for arrays
if (Array.isArray(userInput)) {
  // Works across realms
}

// Strict equality
if (userInput === true) {
  // Only boolean true passes
}

// Use validation libraries
import { z } from 'zod';
const schema = z.object({
  id: z.number(),
  name: z.string(),
});
const result = schema.safeParse(userInput);
if (result.success) {
  const data = result.data;
}
```

## Configuration

```javascript
{
  rules: {
    'secure-coding/no-improper-type-validation': ['warn', {
      userInputVariables: ['req', 'request', 'input', 'body'],
      safeTypeCheckFunctions: ['Array.isArray', 'Number.isFinite'],
      allowInstanceofSameRealm: false
    }]
  }
}
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `userInputVariables` | `string[]` | `['req', 'request', 'input']` | User input variable patterns |
| `safeTypeCheckFunctions` | `string[]` | `['Array.isArray']` | Safe type checking functions |
| `allowInstanceofSameRealm` | `boolean` | `false` | Allow instanceof in same-realm contexts |

## Error Message Format

```
⚠️ CWE-1287 OWASP:A04-Design CVSS:5.3 | Improper Type Validation | MEDIUM [SOC2]
   Fix: Use value != null && typeof value === 'object' | https://cwe.mitre.org/...
```

## Further Reading

- **[CWE-1287](https://cwe.mitre.org/data/definitions/1287.html)** - Improper validation of specified type
- **[typeof null](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof#typeof_null)** - JavaScript typeof quirks
- **[Zod](https://zod.dev/)** - TypeScript-first schema validation

## Related Rules

- [`no-unvalidated-user-input`](./no-unvalidated-user-input.md) - Unvalidated user input
- [`detect-object-injection`](./detect-object-injection.md) - Prototype pollution

