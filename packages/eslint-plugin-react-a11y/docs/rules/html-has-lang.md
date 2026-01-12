# html-has-lang

> **Keywords:** html-has-lang, accessibility, ESLint rule, WCAG, a11y, React accessibility

Require lang attribute on html element. This rule is part of [`eslint-plugin-react-a11y`](https://www.npmjs.com/package/eslint-plugin-react-a11y) and provides LLM-optimized error messages with fix suggestions.

## Quick Summary

| Aspect | Details |
|--------|---------|
| **WCAG Criterion** | 3.1.1 Language of Page |
| **Severity** | Error/Warning (accessibility) |
| **Auto-Fix** | 💡 Suggestions available |
| **Category** | Accessibility |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration |

## Rule Details

This rule helps ensure WCAG 3.1.1 compliance by enforcing: Require lang attribute on html element

### Why This Matters

| Issue | Impact | Standard |
|-------|--------|----------|
| ♿ **Accessibility** | Screen reader and assistive technology users affected | WCAG 3.1.1 |
| ⚖️ **Legal** | ADA/Section 508 compliance risk | Legal Requirement |
| 🔍 **SEO** | Search engines prefer accessible sites | Best Practice |

## Examples

### ❌ Incorrect

```tsx
// Violation of html-has-lang
// See rule source for specific examples
```

### ✅ Correct

```tsx
// Compliant with html-has-lang
// See rule source for specific examples
```

## Configuration

```javascript
// eslint.config.js
{
  rules: {
    'react-a11y/html-has-lang': 'error'
  }
}
```

## WCAG 2.1 Compliance

This rule helps satisfy:
- **3.1.1 Language of Page**: Require lang attribute on html element

## Related Rules

- See [RULES.md](../RULES.md) for all accessibility rules

## Further Reading

- **[WCAG 3.1.1](https://www.w3.org/WAI/WCAG21/Understanding/)** - WCAG guidelines
- **[WebAIM](https://webaim.org/)** - Accessibility resources
- **[MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)** - MDN documentation

## Version

This rule is available in `eslint-plugin-react-a11y` v1.0.0+
