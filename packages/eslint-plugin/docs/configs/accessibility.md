# accessibility Configuration

Enforce WCAG compliance and accessibility best practices.

## Overview

The `accessibility` configuration ensures your web applications are accessible to all users, including those using assistive technologies. It enforces WCAG (Web Content Accessibility Guidelines) compliance.

## Quick Start

```javascript
// eslint.config.js
import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';

export default [
  llmOptimized.configs.accessibility,
];
```

## Rules Included

| Rule | Severity | WCAG | Description |
|------|----------|------|-------------|
| `accessibility/img-requires-alt` | error | 1.1.1 | Images must have alt text |

## WCAG Coverage

| WCAG Level | Guideline | Rule |
|------------|-----------|------|
| A | 1.1.1 Non-text Content | `img-requires-alt` |

## When to Use

**Use `accessibility` when:**
- Building public-facing websites
- Working on government or educational sites
- Meeting ADA/Section 508 compliance
- Improving SEO (search engines value alt text)
- Creating inclusive user experiences

**Combine with other configs:**

```javascript
export default [
  llmOptimized.configs.recommended,
  llmOptimized.configs.accessibility,
];
```

## Configuration Examples

### React Application

```javascript
export default [
  llmOptimized.configs.recommended,
  llmOptimized.configs['react-modern'],
  llmOptimized.configs.accessibility,
];
```

### Next.js Application

```javascript
import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';

export default [
  llmOptimized.configs.accessibility,
  {
    files: ['app/**/*.tsx', 'pages/**/*.tsx'],
    rules: {
      // Stricter for page components
      '@forge-js/llm-optimized/accessibility/img-requires-alt': 'error',
    },
  },
];
```

## Rule Details

### img-requires-alt

All `<img>` elements must have an `alt` attribute:

```jsx
// ❌ Bad: Missing alt attribute
<img src="/hero.jpg" />

// ❌ Bad: Empty alt on meaningful image
<img src="/product.jpg" alt="" />

// ✅ Good: Descriptive alt text
<img src="/hero.jpg" alt="Mountain landscape at sunset" />

// ✅ Good: Empty alt for decorative images
<img src="/decorative-border.png" alt="" role="presentation" />
```

#### Options

```javascript
rules: {
  '@forge-js/llm-optimized/accessibility/img-requires-alt': ['error', {
    // Components that should be treated as img
    components: ['Image', 'Img', 'Picture'],
    
    // Allow empty alt for decorative images with role="presentation"
    allowEmpty: true,
  }],
}
```

## Best Practices

### Writing Good Alt Text

| Image Type | Alt Text Strategy |
|------------|------------------|
| Informative | Describe the content and function |
| Decorative | Use `alt=""` with `role="presentation"` |
| Functional | Describe the action, not the image |
| Complex | Provide detailed description or link to full description |

### Examples

```jsx
// Informative: Product image
<img src="/shoe.jpg" alt="Nike Air Max 90, white with red accents" />

// Decorative: Visual flourish
<img src="/divider.png" alt="" role="presentation" />

// Functional: Logo that links to home
<a href="/">
  <img src="/logo.svg" alt="Company Name - Go to homepage" />
</a>

// Complex: Chart
<figure>
  <img src="/sales-chart.png" alt="Sales growth chart showing 25% increase" />
  <figcaption>
    <a href="/sales-data">View detailed sales data</a>
  </figcaption>
</figure>
```

## Testing Accessibility

### Manual Testing

1. Use screen readers (VoiceOver, NVDA, JAWS)
2. Navigate with keyboard only
3. Check color contrast
4. Test with browser zoom (200%)

### Automated Testing

```bash
# Run accessibility audit
npx eslint . --config accessibility.config.js

# Combine with other a11y tools
npx axe --exit # Run aXe accessibility tests
```

## Extending Accessibility

For comprehensive accessibility, consider additional tools:

```javascript
// eslint.config.js
import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default [
  llmOptimized.configs.accessibility,
  {
    plugins: {
      'jsx-a11y': jsxA11y,
    },
    rules: {
      // Additional a11y rules
      'jsx-a11y/anchor-is-valid': 'error',
      'jsx-a11y/click-events-have-key-events': 'error',
      'jsx-a11y/no-static-element-interactions': 'error',
    },
  },
];
```

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Alt Text Guide](https://webaim.org/techniques/alttext/)
- [MDN Accessibility Guide](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)

