# media-has-caption

> **Keywords:** media-has-caption, accessibility, ESLint rule, WCAG, a11y, React accessibility

Require captions on media elements. This rule is part of [`eslint-plugin-react-a11y`](https://www.npmjs.com/package/eslint-plugin-react-a11y) and provides LLM-optimized error messages with fix suggestions.

## Quick Summary

| Aspect | Details |
|--------|---------|
| **WCAG Criterion** | 1.2.2 Captions |
| **Severity** | Error/Warning (accessibility) |
| **Auto-Fix** | 💡 Suggestions available |
| **Category** | Accessibility |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration |

## Rule Details

This rule helps ensure WCAG 1.2.2 compliance by enforcing: Require captions on media elements

### Why This Matters

| Issue | Impact | Standard |
|-------|--------|----------|
| ♿ **Accessibility** | Screen reader and assistive technology users affected | WCAG 1.2.2 |
| ⚖️ **Legal** | ADA/Section 508 compliance risk | Legal Requirement |
| 🔍 **SEO** | Search engines prefer accessible sites | Best Practice |

## Examples

### ❌ Incorrect

```tsx
// Violation of media-has-caption
// See rule source for specific examples
```

### ✅ Correct

```tsx
// Compliant with media-has-caption
// See rule source for specific examples
```

## Configuration

```javascript
// eslint.config.js
{
  rules: {
    'react-a11y/media-has-caption': 'error'
  }
}
```

## WCAG 2.1 Compliance

This rule helps satisfy:
- **1.2.2 Captions**: Require captions on media elements

## Related Rules

- See [RULES.md](../RULES.md) for all accessibility rules

## Further Reading

- **[WCAG 1.2.2](https://www.w3.org/WAI/WCAG21/Understanding/)** - WCAG guidelines
- **[WebAIM](https://webaim.org/)** - Accessibility resources
- **[MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)** - MDN documentation

## Version

This rule is available in `eslint-plugin-react-a11y` v1.0.0+
