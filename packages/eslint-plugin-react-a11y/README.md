# eslint-plugin-react-a11y

> React accessibility ESLint plugin with 37 LLM-optimized rules for WCAG 2.1 compliance

[![npm version](https://img.shields.io/npm/v/eslint-plugin-react-a11y.svg)](https://www.npmjs.com/package/eslint-plugin-react-a11y)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive ESLint plugin for React accessibility with LLM-optimized error messages, auto-fix capabilities, and structured context for AI assistants.

---

## 📚 Documentation

- **[Rules Reference](./docs/RULES.md)**: Complete list of all 37 rules with configuration options and WCAG mapping.
- **[WCAG 2.1 Guide](https://www.w3.org/WAI/WCAG21/quickref/)**: Official WCAG quick reference.
- **[ESLint MCP Setup](https://eslint.org/docs/latest/use/mcp)**: Enable AI assistant integration.

---

## Features

| Feature | Value |
|---------|-------|
| **Total Rules** | 37 |
| **WCAG Coverage** | 2.1 Level A, AA, AAA |
| **AI Auto-Fix Rate** | 60-80% |
| **Performance** | <10ms overhead per file |
| **Privacy** | 100% local, no cloud calls |
| **ESLint MCP** | ✅ Optimized for MCP integration |

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
| **wcag-aa** | 24 rules | WCAG 2.1 Level AA compliance (includes Level A) |

## Rule Categories

### Anchor Rules (3 rules)

| Rule | Description | WCAG |
|------|-------------|------|
| [`anchor-ambiguous-text`](./docs/rules/anchor-ambiguous-text.md) | Prevent ambiguous link text like "click here" | 2.4.4 |
| [`anchor-has-content`](./docs/rules/anchor-has-content.md) | Require anchor elements to have content | 2.4.4 |
| [`anchor-is-valid`](./docs/rules/anchor-is-valid.md) | Require valid href on anchor elements | 2.4.4 |

### ARIA Rules (4 rules)

| Rule | Description | WCAG |
|------|-------------|------|
| [`aria-activedescendant-has-tabindex`](./docs/rules/aria-activedescendant-has-tabindex.md) | Require tabindex with aria-activedescendant | 4.1.2 |
| [`aria-props`](./docs/rules/aria-props.md) | Validate ARIA property names | 4.1.1 |
| [`aria-role`](./docs/rules/aria-role.md) | Require valid ARIA role values | 4.1.1 |
| [`aria-unsupported-elements`](./docs/rules/aria-unsupported-elements.md) | Prevent ARIA on unsupported elements | 4.1.1 |

### Form & Input Rules (3 rules)

| Rule | Description | WCAG |
|------|-------------|------|
| [`autocomplete-valid`](./docs/rules/autocomplete-valid.md) | Require valid autocomplete attribute | 1.3.5 |
| [`control-has-associated-label`](./docs/rules/control-has-associated-label.md) | Require labels on form controls | 1.3.1 |
| [`label-has-associated-control`](./docs/rules/label-has-associated-control.md) | Require labels to have associated controls | 1.3.1 |

### Event Rules (2 rules)

| Rule | Description | WCAG |
|------|-------------|------|
| [`click-events-have-key-events`](./docs/rules/click-events-have-key-events.md) | Require keyboard events with click events | 2.1.1 |
| [`mouse-events-have-key-events`](./docs/rules/mouse-events-have-key-events.md) | Require keyboard events with mouse events | 2.1.1 |

### Content Rules (5 rules)

| Rule | Description | WCAG |
|------|-------------|------|
| [`heading-has-content`](./docs/rules/heading-has-content.md) | Require heading elements to have content | 1.3.1 |
| [`html-has-lang`](./docs/rules/html-has-lang.md) | Require lang attribute on html element | 3.1.1 |
| [`iframe-has-title`](./docs/rules/iframe-has-title.md) | Require title on iframe elements | 4.1.2 |
| [`lang`](./docs/rules/lang.md) | Require valid lang attribute value | 3.1.1 |
| [`media-has-caption`](./docs/rules/media-has-caption.md) | Require captions on media elements | 1.2.2 |

### Image Rules (2 rules)

| Rule | Description | WCAG |
|------|-------------|------|
| [`img-redundant-alt`](./docs/rules/img-redundant-alt.md) | Prevent redundant words in alt text | 1.1.1 |
| [`img-requires-alt`](./docs/rules/img-requires-alt.md) | Require alt attribute on images | 1.1.1 |

### Interactive Element Rules (6 rules)

| Rule | Description | WCAG |
|------|-------------|------|
| [`interactive-supports-focus`](./docs/rules/interactive-supports-focus.md) | Require focus support on interactive elements | 2.1.1 |
| [`no-interactive-element-to-noninteractive-role`](./docs/rules/no-interactive-element-to-noninteractive-role.md) | Prevent demoting interactive elements | 4.1.2 |
| [`no-noninteractive-element-interactions`](./docs/rules/no-noninteractive-element-interactions.md) | Prevent event handlers on non-interactive elements | 2.1.1 |
| [`no-noninteractive-element-to-interactive-role`](./docs/rules/no-noninteractive-element-to-interactive-role.md) | Prevent promoting non-interactive elements | 4.1.2 |
| [`no-noninteractive-tabindex`](./docs/rules/no-noninteractive-tabindex.md) | Prevent tabindex on non-interactive elements | 2.4.3 |
| [`no-static-element-interactions`](./docs/rules/no-static-element-interactions.md) | Prevent event handlers on static elements | 2.1.1 |

### Focus & Navigation Rules (5 rules)

| Rule | Description | WCAG |
|------|-------------|------|
| [`no-access-key`](./docs/rules/no-access-key.md) | Prevent accessKey attribute usage | 2.1.1 |
| [`no-aria-hidden-on-focusable`](./docs/rules/no-aria-hidden-on-focusable.md) | Prevent aria-hidden on focusable elements | 4.1.2 |
| [`no-autofocus`](./docs/rules/no-autofocus.md) | Prevent autofocus attribute usage | 2.4.3 |
| [`no-keyboard-inaccessible-elements`](./docs/rules/no-keyboard-inaccessible-elements.md) | Prevent keyboard inaccessible elements | 2.1.1 |
| [`tabindex-no-positive`](./docs/rules/tabindex-no-positive.md) | Prevent positive tabindex values | 2.4.3 |

### Visual & Distraction Rules (3 rules)

| Rule | Description | WCAG |
|------|-------------|------|
| [`no-distracting-elements`](./docs/rules/no-distracting-elements.md) | Prevent distracting elements (blink, marquee) | 2.3.1 |
| [`no-missing-aria-labels`](./docs/rules/no-missing-aria-labels.md) | Require ARIA labels on interactive elements | 4.1.2 |
| [`no-redundant-roles`](./docs/rules/no-redundant-roles.md) | Prevent redundant role attributes | 4.1.1 |

### Role Rules (3 rules)

| Rule | Description | WCAG |
|------|-------------|------|
| [`role-has-required-aria-props`](./docs/rules/role-has-required-aria-props.md) | Require required ARIA properties for roles | 4.1.2 |
| [`role-supports-aria-props`](./docs/rules/role-supports-aria-props.md) | Validate ARIA properties for roles | 4.1.2 |
| [`prefer-tag-over-role`](./docs/rules/prefer-tag-over-role.md) | Prefer semantic HTML over role attribute | 1.3.1 |

### Scope Rule (1 rule)

| Rule | Description | WCAG |
|------|-------------|------|
| [`scope`](./docs/rules/scope.md) | Require valid scope attribute usage | 1.3.1 |

## Configuration Examples

### Basic Usage

```javascript
// eslint.config.js
import reactA11y from 'eslint-plugin-react-a11y';

export default [
  reactA11y.configs.recommended,
];
```

### With TypeScript

```javascript
import reactA11y from 'eslint-plugin-react-a11y';
import tseslint from 'typescript-eslint';

export default [
  ...tseslint.configs.recommended,
  reactA11y.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'react-a11y/img-requires-alt': 'error',
    },
  },
];
```

### Strict WCAG Compliance

```javascript
import reactA11y from 'eslint-plugin-react-a11y';

export default [
  reactA11y.configs['wcag-aa'],
  {
    // Additional customizations
  },
];
```

### Custom Configuration

```javascript
import reactA11y from 'eslint-plugin-react-a11y';

export default [
  {
    plugins: {
      'react-a11y': reactA11y,
    },
    rules: {
      'react-a11y/img-requires-alt': ['error', {
        allowAriaLabel: true,
        allowAriaLabelledby: true,
      }],
      'react-a11y/anchor-ambiguous-text': ['warn', {
        words: ['click here', 'here', 'more', 'read more', 'learn more'],
      }],
    },
  },
];
```

## Error Message Format

All rules produce LLM-optimized 2-line structured messages:

```
Line 1: [Icon] [Compliance] | [Description] | [SEVERITY]
Line 2:    Fix: [instruction] | [doc-link]
```

**Example:**

```
♿ WCAG 1.1.1 | Image missing alt text | CRITICAL
   Fix: Add alt="Descriptive text about image" | https://www.w3.org/WAI/tutorials/images/
```

## ESLint MCP Integration

This plugin is optimized for ESLint's Model Context Protocol (MCP):

```json
// .cursor/mcp.json
{
  "mcpServers": {
    "eslint": {
      "command": "npx",
      "args": ["@eslint/mcp@latest"]
    }
  }
}
```

## WCAG 2.1 Compliance Mapping

| WCAG Criterion | Rule(s) |
|----------------|---------|
| 1.1.1 Non-text Content | `img-requires-alt`, `img-redundant-alt` |
| 1.2.2 Captions | `media-has-caption` |
| 1.3.1 Info and Relationships | `heading-has-content`, `scope`, `role-has-required-aria-props`, `prefer-tag-over-role` |
| 1.3.5 Identify Input Purpose | `autocomplete-valid` |
| 2.1.1 Keyboard | `click-events-have-key-events`, `interactive-supports-focus`, `no-keyboard-inaccessible-elements` |
| 2.3.1 Three Flashes | `no-distracting-elements` |
| 2.4.3 Focus Order | `tabindex-no-positive`, `no-autofocus` |
| 2.4.4 Link Purpose | `anchor-has-content`, `anchor-ambiguous-text` |
| 3.1.1 Language of Page | `html-has-lang`, `lang` |
| 4.1.1 Parsing | `aria-props`, `aria-role`, `aria-unsupported-elements` |
| 4.1.2 Name, Role, Value | `role-supports-aria-props`, `iframe-has-title` |

## Related Packages

- **@forge-js/eslint-plugin-llm-optimized** - Full plugin with 144+ rules
- **eslint-plugin-secure-coding** - Security-focused rules
- **@interlace/eslint-devkit** - Build custom LLM-optimized rules

## License

MIT © Ofri Peretz
