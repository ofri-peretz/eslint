# img-requires-alt

> **Keywords:** img-requires-alt, accessibility, ESLint rule, WCAG, a11y, React accessibility
**CWE:** [CWE-494](https://cwe.mitre.org/data/definitions/494.html)

Require alt attribute on images. This rule is part of [`eslint-plugin-react-a11y`](https://www.npmjs.com/package/eslint-plugin-react-a11y) and provides LLM-optimized error messages with fix suggestions.

## Quick Summary

| Aspect | Details |
|--------|---------|
| **WCAG Criterion** | 1.1.1 Non-text Content |
| **Severity** | Error/Warning (accessibility) |
| **Auto-Fix** | 💡 Suggestions available |
| **Category** | Accessibility |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration |

## Rule Details

This rule helps ensure WCAG 1.1.1 compliance by enforcing: Require alt attribute on images

### Why This Matters

| Issue | Impact | Standard |
|-------|--------|----------|
| ♿ **Accessibility** | Screen reader and assistive technology users affected | WCAG 1.1.1 |
| ⚖️ **Legal** | ADA/Section 508 compliance risk | Legal Requirement |
| 🔍 **SEO** | Search engines prefer accessible sites | Best Practice |

## Examples

### ❌ Incorrect

```tsx
// Violation of img-requires-alt
// See rule source for specific examples
```

### ✅ Correct

```tsx
// Compliant with img-requires-alt
// See rule source for specific examples
```

## Configuration

```javascript
// eslint.config.js
{
  rules: {
    'react-a11y/img-requires-alt': 'error'
  }
}
```

## WCAG 2.1 Compliance

This rule helps satisfy:
- **1.1.1 Non-text Content**: Require alt attribute on images

## Related Rules

- See [RULES.md](../RULES.md) for all accessibility rules

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

- **[WCAG 1.1.1](https://www.w3.org/WAI/WCAG21/Understanding/)** - WCAG guidelines
- **[WebAIM](https://webaim.org/)** - Accessibility resources
- **[MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)** - MDN documentation

## Version

This rule is available in `eslint-plugin-react-a11y` v1.0.0+
