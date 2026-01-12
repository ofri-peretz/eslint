# no-aria-hidden-on-focusable

> **Keywords:** no-aria-hidden-on-focusable, accessibility, ESLint rule, WCAG, a11y, React accessibility

Prevent aria-hidden on focusable elements. This rule is part of [`eslint-plugin-react-a11y`](https://www.npmjs.com/package/eslint-plugin-react-a11y) and provides LLM-optimized error messages with fix suggestions.

## Quick Summary

| Aspect | Details |
|--------|---------|
| **WCAG Criterion** | 4.1.2 Name, Role, Value |
| **Severity** | Error/Warning (accessibility) |
| **Auto-Fix** | 💡 Suggestions available |
| **Category** | Accessibility |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration |

## Rule Details

This rule helps ensure WCAG 4.1.2 compliance by enforcing: Prevent aria-hidden on focusable elements

### Why This Matters

| Issue | Impact | Standard |
|-------|--------|----------|
| ♿ **Accessibility** | Screen reader and assistive technology users affected | WCAG 4.1.2 |
| ⚖️ **Legal** | ADA/Section 508 compliance risk | Legal Requirement |
| 🔍 **SEO** | Search engines prefer accessible sites | Best Practice |

## Examples

### ❌ Incorrect

```tsx
// Violation of no-aria-hidden-on-focusable
// See rule source for specific examples
```

### ✅ Correct

```tsx
// Compliant with no-aria-hidden-on-focusable
// See rule source for specific examples
```

## Configuration

```javascript
// eslint.config.js
{
  rules: {
    'react-a11y/no-aria-hidden-on-focusable': 'error'
  }
}
```

## WCAG 2.1 Compliance

This rule helps satisfy:
- **4.1.2 Name, Role, Value**: Prevent aria-hidden on focusable elements

## Related Rules

- See [RULES.md](../RULES.md) for all accessibility rules

## Further Reading

- **[WCAG 4.1.2](https://www.w3.org/WAI/WCAG21/Understanding/)** - WCAG guidelines
- **[WebAIM](https://webaim.org/)** - Accessibility resources
- **[MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)** - MDN documentation

## Version

This rule is available in `eslint-plugin-react-a11y` v1.0.0+
