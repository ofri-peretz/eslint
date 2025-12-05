# eslint-plugin-react-a11y - AI Agent Guide

## Package Overview

| Field | Value |
|-------|-------|
| **Name** | eslint-plugin-react-a11y |
| **Version** | 1.0.0 |
| **Description** | React accessibility ESLint plugin with 37 LLM-optimized rules for WCAG 2.1 compliance |
| **Type** | ESLint Plugin |
| **Language** | TypeScript |
| **Node.js** | >=18.0.0 |
| **ESLint** | ^8.0.0 \|\| ^9.0.0 |
| **License** | MIT |
| **Homepage** | https://github.com/ofri-peretz/forge-js#readme |
| **Repository** | https://github.com/ofri-peretz/forge-js.git |
| **Directory** | packages/eslint-plugin-react-a11y |

## Installation

```bash
npm install --save-dev eslint-plugin-react-a11y
# or
pnpm add -D eslint-plugin-react-a11y
# or
yarn add -D eslint-plugin-react-a11y
```

## Quick Start

```javascript
// eslint.config.js
import reactA11y from 'eslint-plugin-react-a11y';

export default [
  reactA11y.configs.recommended,
];
```

## Available Presets

| Preset | Rules | Description |
|--------|-------|-------------|
| **recommended** | 37 rules (mixed error/warn) | Balanced accessibility for most projects |
| **strict** | 37 rules (all errors) | Maximum accessibility enforcement |
| **wcag-a** | 16 rules | WCAG 2.1 Level A compliance |
| **wcag-aa** | 24 rules | WCAG 2.1 Level AA compliance |

## Rule Categories

### Anchor Rules (3 rules)
- `anchor-ambiguous-text` - Prevent ambiguous link text
- `anchor-has-content` - Require content in anchor elements
- `anchor-is-valid` - Require valid href on anchors

### ARIA Rules (4 rules)
- `aria-activedescendant-has-tabindex` - WCAG 4.1.2
- `aria-props` - Validate ARIA property names
- `aria-role` - Validate ARIA role values
- `aria-unsupported-elements` - Prevent ARIA on unsupported elements

### Form & Input Rules (3 rules)
- `autocomplete-valid` - WCAG 1.3.5
- `control-has-associated-label` - WCAG 1.3.1
- `label-has-associated-control` - WCAG 1.3.1

### Event Rules (2 rules)
- `click-events-have-key-events` - WCAG 2.1.1 keyboard accessibility
- `mouse-events-have-key-events` - WCAG 2.1.1 keyboard accessibility

### Content Rules (5 rules)
- `heading-has-content` - WCAG 1.3.1
- `html-has-lang` - WCAG 3.1.1
- `iframe-has-title` - WCAG 4.1.2
- `lang` - Validate lang attribute
- `media-has-caption` - WCAG 1.2.2

### Image Rules (2 rules)
- `img-redundant-alt` - Prevent redundant alt text
- `img-requires-alt` - WCAG 1.1.1 non-text content

### Interactive Element Rules (6 rules)
- `interactive-supports-focus` - WCAG 2.1.1
- `no-interactive-element-to-noninteractive-role` - Prevent role demotion
- `no-noninteractive-element-interactions` - WCAG 2.1.1
- `no-noninteractive-element-to-interactive-role` - Prevent role promotion
- `no-noninteractive-tabindex` - WCAG 2.4.3
- `no-static-element-interactions` - WCAG 2.1.1

### Focus & Navigation Rules (5 rules)
- `no-access-key` - Prevent accessKey usage
- `no-aria-hidden-on-focusable` - WCAG 4.1.2
- `no-autofocus` - WCAG 2.4.3
- `no-keyboard-inaccessible-elements` - WCAG 2.1.1
- `tabindex-no-positive` - WCAG 2.4.3

### Visual & Distraction Rules (3 rules)
- `no-distracting-elements` - WCAG 2.3.1
- `no-missing-aria-labels` - WCAG 4.1.2
- `no-redundant-roles` - Prevent redundant ARIA roles

### Role Rules (3 rules)
- `role-has-required-aria-props` - WCAG 4.1.2
- `role-supports-aria-props` - WCAG 4.1.2
- `prefer-tag-over-role` - Semantic HTML preference

### Scope Rule (1 rule)
- `scope` - Validate scope attribute usage

## Error Message Format

All rules produce LLM-optimized 2-line structured messages:

```
Line 1: [Icon] [WCAG Ref] | [Description] | [SEVERITY]
Line 2:    Fix: [instruction] | [doc-link]
```

**Example:**
```
♿ WCAG 1.1.1 | Image missing alt text | CRITICAL
   Fix: Add alt="Descriptive text about image" | https://www.w3.org/WAI/tutorials/images/
```

## ESLint MCP Integration

Configure in `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "eslint": {
      "command": "npx",
      "args": ["@eslint/mcp@latest"]
    }
  }
}
```

## Key Features

| Feature | Value |
|---------|-------|
| **Total Rules** | 37 |
| **WCAG Coverage** | Level A, AA, AAA |
| **AI Auto-Fix Rate** | 60-80% |
| **Performance** | <10ms overhead per file |
| **Privacy** | 100% local, no cloud calls |

## FAQ

**Q: How do I enable all accessibility rules?**
A: Use `reactA11y.configs.strict`

**Q: How do I configure a specific rule?**
A: `'react-a11y/img-requires-alt': ['error', { allowAriaLabel: true }]`

**Q: How do I disable a rule inline?**
A: `// eslint-disable-next-line react-a11y/img-requires-alt`

**Q: Is it compatible with TypeScript?**
A: Yes, native TypeScript support.

**Q: Does it work with ESLint 9 flat config?**
A: Yes, fully compatible.

## Related Packages

- **@forge-js/eslint-plugin-llm-optimized** - Full plugin with 144+ rules
- **eslint-plugin-secure-coding** - Security-focused rules
- **@interlace/eslint-devkit** - Build custom LLM-optimized rules

## License

MIT © Ofri Peretz

