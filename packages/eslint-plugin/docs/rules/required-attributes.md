# required-attributes

> **Keywords:** React, accessibility, ESLint rule, required attributes, aria attributes, React props, auto-fix, LLM-optimized, React accessibility

Enforce required attributes on React components with customizable ignore lists. This rule is part of [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized) and provides LLM-optimized error messages with fix suggestions.

**💡 Provides suggestions** | **🔧 Automatically fixable**

## Quick Summary

| Aspect         | Details                                                    |
| -------------- | ---------------------------------------------------------- |
| **Severity**   | Warning (accessibility best practice)                      |
| **Auto-Fix**   | ✅ Yes (adds missing attributes)                           |
| **Category**   | React / Accessibility                                      |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                    |
| **Best For**   | React/Next.js applications, accessibility-focused projects |

## Rule Details

Ensures React components have required attributes (e.g., accessibility attributes, data attributes).

## Configuration

| Option             | Type              | Default | Description                   |
| ------------------ | ----------------- | ------- | ----------------------------- |
| `attributes`       | `AttributeRule[]` | `[]`    | List of required attributes   |
| `ignoreComponents` | `string[]`        | `[]`    | Components to ignore globally |

### AttributeRule Object

| Property         | Type       | Required | Description                       |
| ---------------- | ---------- | -------- | --------------------------------- |
| `attribute`      | `string`   | Yes      | Required attribute name           |
| `ignoreTags`     | `string[]` | No       | Tags to ignore for this attribute |
| `message`        | `string`   | No       | Custom error message              |
| `suggestedValue` | `string`   | No       | Suggested value for auto-fix      |

## Examples

### ❌ Incorrect

```tsx
// Missing accessibility attributes
<button onClick={handleClick}>
  Click me
</button>

<img src="/photo.jpg" />
```

### ✅ Correct

```tsx
// With required attributes
<button onClick={handleClick} aria-label="Submit form">
  Click me
</button>

<img src="/photo.jpg" alt="Profile photo" />
```

## Configuration Examples

### Accessibility Enforcement

```javascript
{
  rules: {
    '@forge-js/required-attributes': ['error', {
      attributes: [
        {
          attribute: 'alt',
          ignoreTags: ['div', 'span'],
          message: 'Images must have alt text for accessibility',
          suggestedValue: ''
        },
        {
          attribute: 'aria-label',
          ignoreTags: ['div', 'p'],
          message: 'Interactive elements need aria-label'
        }
      ],
      ignoreComponents: ['Icon', 'Logo']
    }]
  }
}
```

### Data Tracking Attributes

```javascript
{
  rules: {
    '@forge-js/required-attributes': ['warn', {
      attributes: [
        {
          attribute: 'data-testid',
          message: 'Add data-testid for E2E testing',
          suggestedValue: 'element-name'
        },
        {
          attribute: 'data-analytics',
          ignoreTags: ['div', 'span'],
          message: 'Trackable elements need data-analytics'
        }
      ]
    }]
  }
}
```

## Why This Matters

| Issue                | Impact                           | Solution                 |
| -------------------- | -------------------------------- | ------------------------ |
| ♿ **Accessibility** | Screen readers can't interpret   | Enforce ARIA attributes  |
| 🧪 **Testing**       | Hard to select elements in tests | Require data-testid      |
| 📊 **Analytics**     | Missing tracking data            | Enforce data attributes  |
| 🎨 **Consistency**   | Inconsistent attribute usage     | Standardize requirements |

## Comparison with Alternatives

| Feature                | required-attributes | eslint-plugin-jsx-a11y | eslint-plugin-react |
| ---------------------- | ------------------- | ---------------------- | ------------------- |
| **Custom Attributes**  | ✅ Yes              | ❌ No                  | ❌ No               |
| **Auto-Fix**           | ✅ Yes              | ⚠️ Limited             | ❌ No               |
| **LLM-Optimized**      | ✅ Yes              | ❌ No                  | ❌ No               |
| **ESLint MCP**         | ✅ Optimized        | ❌ No                  | ❌ No               |
| **Configurable Rules** | ✅ Yes              | ⚠️ Limited             | ⚠️ Limited          |

## Related Rules

- [`img-requires-alt`](./img-requires-alt.md) - Specific img alt enforcement
- [`react-no-inline-functions`](./react-no-inline-functions.md) - React performance optimization
- [`react-class-to-hooks`](./react-class-to-hooks.md) - React modernization

## Further Reading

- **[WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)** - Web accessibility guidelines
- **[React Accessibility](https://react.dev/learn/accessibility)** - React accessibility guide
- **[ARIA Attributes](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA)** - ARIA documentation
- **[ESLint MCP Setup](https://eslint.org/docs/latest/use/mcp)** - Enable AI assistant integration
