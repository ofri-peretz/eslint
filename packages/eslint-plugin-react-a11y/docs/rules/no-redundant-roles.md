# no-redundant-roles

> **Keywords:** no-redundant-roles, accessibility, ESLint rule, WCAG, a11y, React accessibility

Prevent redundant role attributes. This rule is part of [`eslint-plugin-react-a11y`](https://www.npmjs.com/package/eslint-plugin-react-a11y) and provides LLM-optimized error messages with fix suggestions.

## Quick Summary

| Aspect | Details |
|--------|---------|
| **WCAG Criterion** | 4.1.1 Parsing |
| **Severity** | Error/Warning (accessibility) |
| **Auto-Fix** | 💡 Suggestions available |
| **Category** | Accessibility |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration |

## Rule Details

This rule helps ensure WCAG 4.1.1 compliance by enforcing: Prevent redundant role attributes

### Why This Matters

| Issue | Impact | Standard |
|-------|--------|----------|
| ♿ **Accessibility** | Screen reader and assistive technology users affected | WCAG 4.1.1 |
| ⚖️ **Legal** | ADA/Section 508 compliance risk | Legal Requirement |
| 🔍 **SEO** | Search engines prefer accessible sites | Best Practice |

## Examples

### ❌ Incorrect

```tsx
// Violation of no-redundant-roles
// See rule source for specific examples
```

### ✅ Correct

```tsx
// Compliant with no-redundant-roles
// See rule source for specific examples
```

## Configuration

```javascript
// eslint.config.js
{
  rules: {
    'react-a11y/no-redundant-roles': 'error'
  }
}
```

## WCAG 2.1 Compliance

This rule helps satisfy:
- **4.1.1 Parsing**: Prevent redundant role attributes

## Related Rules

- See [RULES.md](../RULES.md) for all accessibility rules

## Further Reading

- **[WCAG 4.1.1](https://www.w3.org/WAI/WCAG21/Understanding/)** - WCAG guidelines
- **[WebAIM](https://webaim.org/)** - Accessibility resources
- **[MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)** - MDN documentation

## Version

This rule is available in `eslint-plugin-react-a11y` v1.0.0+
