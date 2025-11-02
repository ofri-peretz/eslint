# required-attributes

Enforce required attributes on React components with customizable ignore lists.

**💡 Provides suggestions** | **🔧 Automatically fixable**

## Rule Details

Ensures React components have required attributes (e.g., accessibility attributes, data attributes).

## Configuration

| Option              | Type               | Default | Description                          |
| ------------------- | ------------------ | ------- | ------------------------------------ |
| `attributes`        | `AttributeRule[]`  | `[]`    | List of required attributes          |
| `ignoreComponents`  | `string[]`         | `[]`    | Components to ignore globally        |

### AttributeRule Object

| Property         | Type       | Required | Description                              |
| ---------------- | ---------- | -------- | ---------------------------------------- |
| `attribute`      | `string`   | Yes      | Required attribute name                  |
| `ignoreTags`     | `string[]` | No       | Tags to ignore for this attribute        |
| `message`        | `string`   | No       | Custom error message                     |
| `suggestedValue` | `string`   | No       | Suggested value for auto-fix             |

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

| Issue                  | Impact                              | Solution                   |
| ---------------------- | ----------------------------------- | -------------------------- |
| ♿ **Accessibility**    | Screen readers can't interpret      | Enforce ARIA attributes    |
| 🧪 **Testing**         | Hard to select elements in tests    | Require data-testid        |
| 📊 **Analytics**       | Missing tracking data               | Enforce data attributes    |
| 🎨 **Consistency**     | Inconsistent attribute usage        | Standardize requirements   |

## Related Rules

- [`img-requires-alt`](./img-requires-alt.md) - Specific img alt enforcement

