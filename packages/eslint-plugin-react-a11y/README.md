# eslint-plugin-react-a11y

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Accessibility rules for React applications.
</p>
[![npm version](https://img.shields.io/npm/v/eslint-plugin-react-a11y.svg)](https://www.npmjs.com/package/eslint-plugin-react-a11y)
[![npm downloads](https://img.shields.io/npm/dm/eslint-plugin-react-a11y.svg)](https://www.npmjs.com/package/eslint-plugin-react-a11y)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![codecov](https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=react-a11y)](https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=react-a11y)
[![Dec 2025](https://img.shields.io/badge/Dec_2025-blue?logo=rocket&logoColor=white)](https://github.com/ofri-peretz/eslint)

## Description

> **📘 Full Documentation:** [https://eslint.interlace.tools/docs/react-a11y](https://eslint.interlace.tools/docs/react-a11y)
>
> **Note:** This plugin focuses on **WCAG 2.1** accessibility compliance rather than OWASP security. For security rules, see [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding).

> [!TIP]
> For **complete OWASP coverage**, combine with [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) which provides 78 additional rules covering all OWASP categories.

## Philosophy
 
**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

```bash
npm install eslint-plugin-react-a11y --save-dev
```

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Accessibility rules for React applications.
</p>

## Description

## Getting Started

```bash
npm install eslint-plugin-react-a11y --save-dev
```

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Accessibility rules for React applications.
</p>
## Description

## Getting Started

```bash
npm install eslint-plugin-react-a11y --save-dev
```

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Accessibility rules for React applications.
</p>
## Description

## Getting Started

```bash
npm install eslint-plugin-react-a11y --save-dev
```

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Accessibility rules for React applications.
</p>
## Description

## Getting Started

```bash
npm install eslint-plugin-react-a11y --save-dev
```

<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

Accessibility rules for React applications.

## Description

## Getting Started

```bash
npm install eslint-plugin-react-a11y --save-dev
```

Accessibility rules for React applications.

## Description

## Getting Started

```bash
npm install eslint-plugin-react-a11y --save-dev
```

---

| Standard     | Level | Coverage | Rule | CWE | OWASP | CVSS | Description | 💼  | ⚠️  | 🔧  | 💡  | 🚫  |
| :----------- | :---: | :------: | :--: | :-- | :---: | :--: | :---------: | :-: | :-: | --- | --- | --- |
| **WCAG 2.1** |       |          |      |     |       |      |             |     |     |
| **WCAG 2.1** |       |          |      |     |       |      |             |     |     |
| **WCAG 2.1** |       |          |      |     |       |      |             |     |     |

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

export default [reactA11y.configs.recommended];
```

## Available Presets

| Preset          | Rule | CWE | OWASP | CVSS                        | Description | 💼  | ⚠️  | 🔧  | 💡  | 🚫  |
| :-------------- | :--: | :-: | :---: | :-------------------------- | :---------: | :-: | :-: | :-: | :-: | --- |
| **recommended** |      |     |       | 37 rules (mixed error/warn) |             |     |     |     |     |
| **strict**      |      |     |       | 37 rules (all errors)       |             |     |     |     |     |
| **wcag-a**      |      |     |       | 16 rules                    |             |     |     |     |     |
| **wcag-aa**     |      |     |       | 24 rules                    |             |     |     |     |     |

## Rules
| Rule | Tag | CWE | OWASP | CVSS | Description | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :--- | :---: | :---: | :---: | :--- | :-: | :-: | :-: | :-: | :-: |
|  Rule                                                                                                              | General |  Tag      |    CWE    |   OWASP   |   CVSS    |  Description  |              💼              |                          ⚠️                          |                       🔧                        |  💡   |  🚫   |
|  [`anchor-ambiguous-text`](./docs/rules/anchor-ambiguous-text.md)                                                  | General |  General  |  General  |  General  |  General  |  General      |         Anchor Rules         |                       CWE-1078                       |  Prevent ambiguous link text like "click here"  |  ⚠️   |
|  [`anchor-has-content`](./docs/rules/anchor-has-content.md)                                                        | General |  General  |  General  |  General  |  General  |  General      |         Anchor Rules         |                       CWE-1078                       |     Require anchor elements to have content     |  💼   |
|  [`anchor-is-valid`](./docs/rules/anchor-is-valid.md)                                                              | General |  General  |  General  |  General  |  General  |  General      |         Anchor Rules         |                       CWE-1078                       |      Require valid href on anchor elements      |  💼   |
|  [`aria-activedescendant-has-tabindex`](./docs/rules/aria-activedescendant-has-tabindex.md)                        | General |  General  |  General  |  General  |  General  |  General      |          ARIA Rules          |     Require tabindex with aria-activedescendant      |
|  [`aria-props`](./docs/rules/aria-props.md)                                                                        | General |  General  |  General  |  General  |  General  |  General      |          ARIA Rules          |             Validate ARIA property names             |
|  [`aria-role`](./docs/rules/aria-role.md)                                                                          | General |  General  |  General  |  General  |  General  |  General      |          ARIA Rules          |            Require valid ARIA role values            |
|  [`aria-unsupported-elements`](./docs/rules/aria-unsupported-elements.md)                                          | General |  General  |  General  |  General  |  General  |  General      |          ARIA Rules          |         Prevent ARIA on unsupported elements         |
|  [`autocomplete-valid`](./docs/rules/autocomplete-valid.md)                                                        | General |  General  |  General  |  General  |  General  |  General      |      Form & Input Rules      |         Require valid autocomplete attribute         |
|  [`control-has-associated-label`](./docs/rules/control-has-associated-label.md)                                    | General |  General  |  General  |  General  |  General  |  General      |      Form & Input Rules      |           Require labels on form controls            |
|  [`label-has-associated-control`](./docs/rules/label-has-associated-control.md)                                    | General |  General  |  General  |  General  |  General  |  General      |      Form & Input Rules      |      Require labels to have associated controls      |
|  [`click-events-have-key-events`](./docs/rules/click-events-have-key-events.md)                                    | General |  General  |  General  |  General  |  General  |  General      |         Event Rules          |      Require keyboard events with click events       |
|  [`mouse-events-have-key-events`](./docs/rules/mouse-events-have-key-events.md)                                    | General |  General  |  General  |  General  |  General  |  General      |         Event Rules          |      Require keyboard events with mouse events       |
|  [`heading-has-content`](./docs/rules/heading-has-content.md)                                                      | General |  General  |  General  |  General  |  General  |  General      |        Content Rules         |       Require heading elements to have content       |
|  [`html-has-lang`](./docs/rules/html-has-lang.md)                                                                  | General |  General  |  General  |  General  |  General  |  General      |        Content Rules         |        Require lang attribute on html element        |
|  [`iframe-has-title`](./docs/rules/iframe-has-title.md)                                                            | General |  General  |  General  |  General  |  General  |  General      |        Content Rules         |           Require title on iframe elements           |
|  [`lang`](./docs/rules/lang.md)                                                                                    | General |  General  |  General  |  General  |  General  |  General      |        Content Rules         |          Require valid lang attribute value          |
|  [`media-has-caption`](./docs/rules/media-has-caption.md)                                                          | General |  General  |  General  |  General  |  General  |  General      |        Content Rules         |          Require captions on media elements          |
|  [`img-redundant-alt`](./docs/rules/img-redundant-alt.md)                                                          | General |  General  |  General  |  General  |  General  |  General      |         Image Rules          |         Prevent redundant words in alt text          |
|  [`img-requires-alt`](./docs/rules/img-requires-alt.md)                                                            | General |  General  |  General  |  General  |  General  |  General      |         Image Rules          |           Require alt attribute on images            |
|  [`interactive-supports-focus`](./docs/rules/interactive-supports-focus.md)                                        | General |  General  |  General  |  General  |  General  |  General      |  Interactive Element Rules   |    Require focus support on interactive elements     |
|  [`no-interactive-element-to-noninteractive-role`](./docs/rules/no-interactive-element-to-noninteractive-role.md)  | General |  General  |  General  |  General  |  General  |  General      |  Interactive Element Rules   |        Prevent demoting interactive elements         |
|  [`no-noninteractive-element-interactions`](./docs/rules/no-noninteractive-element-interactions.md)                | General |  General  |  General  |  General  |  General  |  General      |  Interactive Element Rules   |  Prevent event handlers on non-interactive elements  |
|  [`no-noninteractive-element-to-interactive-role`](./docs/rules/no-noninteractive-element-to-interactive-role.md)  | General |  General  |  General  |  General  |  General  |  General      |  Interactive Element Rules   |      Prevent promoting non-interactive elements      |
|  [`no-noninteractive-tabindex`](./docs/rules/no-noninteractive-tabindex.md)                                        | General |  General  |  General  |  General  |  General  |  General      |  Interactive Element Rules   |     Prevent tabindex on non-interactive elements     |
|  [`no-static-element-interactions`](./docs/rules/no-static-element-interactions.md)                                | General |  General  |  General  |  General  |  General  |  General      |  Interactive Element Rules   |      Prevent event handlers on static elements       |
|  [`no-access-key`](./docs/rules/no-access-key.md)                                                                  | General |  General  |  General  |  General  |  General  |  General      |   Focus & Navigation Rules   |          Prevent accessKey attribute usage           |
|  [`no-aria-hidden-on-focusable`](./docs/rules/no-aria-hidden-on-focusable.md)                                      | General |  General  |  General  |  General  |  General  |  General      |   Focus & Navigation Rules   |      Prevent aria-hidden on focusable elements       |
|  [`no-autofocus`](./docs/rules/no-autofocus.md)                                                                    | General |  General  |  General  |  General  |  General  |  General      |   Focus & Navigation Rules   |          Prevent autofocus attribute usage           |
|  [`no-keyboard-inaccessible-elements`](./docs/rules/no-keyboard-inaccessible-elements.md)                          | General |  General  |  General  |  General  |  General  |  General      |   Focus & Navigation Rules   |        Prevent keyboard inaccessible elements        |
|  [`tabindex-no-positive`](./docs/rules/tabindex-no-positive.md)                                                    | General |  General  |  General  |  General  |  General  |  General      |   Focus & Navigation Rules   |           Prevent positive tabindex values           |
|  [`no-distracting-elements`](./docs/rules/no-distracting-elements.md)                                              | General |  General  |  General  |  General  |  General  |  General      |  Visual & Distraction Rules  |    Prevent distracting elements (blink, marquee)     |
|  [`no-missing-aria-labels`](./docs/rules/no-missing-aria-labels.md)                                                | General |  General  |  General  |  General  |  General  |  General      |  Visual & Distraction Rules  |     Require ARIA labels on interactive elements      |
|  [`no-redundant-roles`](./docs/rules/no-redundant-roles.md)                                                        | General |  General  |  General  |  General  |  General  |  General      |  Visual & Distraction Rules  |          Prevent redundant role attributes           |
|  [`role-has-required-aria-props`](./docs/rules/role-has-required-aria-props.md)                                    | General |  General  |  General  |  General  |  General  |  General      |          Role Rules          |      Require required ARIA properties for roles      |
|  [`role-supports-aria-props`](./docs/rules/role-supports-aria-props.md)                                            | General |  General  |  General  |  General  |  General  |  General      |          Role Rules          |          Validate ARIA properties for roles          |
|  [`prefer-tag-over-role`](./docs/rules/prefer-tag-over-role.md)                                                    | General |  General  |  General  |  General  |  General  |  General      |          Role Rules          |       Prefer semantic HTML over role attribute       |
|  [`scope`](./docs/rules/scope.md)                                                                                  | General |  General  |  General  |  General  |  General  |  General      |          Scope Rule          |         Require valid scope attribute usage          |

## Configuration Examples

### Basic Usage

```javascript
// eslint.config.js
import reactA11y from 'eslint-plugin-react-a11y';

export default [reactA11y.configs.recommended];
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
      'react-a11y/img-requires-alt': [
        'error',
        {
          allowAriaLabel: true,
          allowAriaLabelledby: true,
        },
      ],
      'react-a11y/anchor-ambiguous-text': [
        'warn',
        {
          words: ['click here', 'here', 'more', 'read more', 'learn more'],
        },
      ],
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

| WCAG Criterion               | Rule | CWE | OWASP | CVSS | Description | 💼  | ⚠️  | 🔧  | 💡  | 🚫  |
| :--------------------------- | :--: | :-: | :---: | :--- | :---------: | :-: | :-: | :-: | :-: | --- |
| 1.1.1 Non-text Content       |      |     |       |      |             |     |     |     |     |
| 1.2.2 Captions               |      |     |       |      |             |     |     |     |     |
| 1.3.1 Info and Relationships |      |     |       |      |             |     |     |     |     |
| 1.3.5 Identify Input Purpose |      |     |       |      |             |     |     |     |     |
| 2.1.1 Keyboard               |      |     |       |      |             |     |     |     |     |
| 2.3.1 Three Flashes          |      |     |       |      |             |     |     |     |     |
| 2.4.3 Focus Order            |      |     |       |      |             |     |     |     |     |
| 2.4.4 Link Purpose           |      |     |       |      |             |     |     |     |     |
| 3.1.1 Language of Page       |      |     |       |      |             |     |     |     |     |
| 4.1.1 Parsing                |      |     |       |      |             |     |     |     |     |
| 4.1.2 Name, Role, Value      |      |     |       |      |             |     |     |     |     |

## Related Packages

- **eslint-plugin-llm-optimized** - Full plugin with 144+ rules
- **eslint-plugin-secure-coding** - Security-focused rules
- **@interlace/eslint-devkit** - Build custom LLM-optimized rules

## License

MIT © Ofri Peretz

<a href="https://eslint.interlace.tools/docs/react-a11y"><img src="https://eslint.interlace.tools/images/og-react.png" alt="ESLint Interlace Plugin" width="100%" /></a>