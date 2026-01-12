<p align="center">
  <a href="https://eslint.interlace.tools" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Accessibility (a11y) rules for React applications, enforcing WCAG standards.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-react-a11y" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-react-a11y.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-react-a11y" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-react-a11y.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=react-a11y" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=react-a11y" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
</p>

## Description

This plugin ensures your React applications are accessible to all users by strictly enforcing WCAG standards. It automatically detects common accessibility issues in your JSX, such as missing alt text or improper aria labels, and guides you toward compliant solutions. Implementing these rules helps you build inclusive web experiences that meet modern accessibility requirements.

## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/react-a11y), visit [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/react-a11y), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- [가이드](https://eslint.interlace.tools/docs/react-a11y) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/react-a11y)は [eslint.interlace.tools](https://eslint.interlace.tools)でご確認ください。 📚
- Para ver la [guía](https://eslint.interlace.tools/docs/react-a11y), visita [eslint.interlace.tools](https://eslint.interlace.tools). 📚
- للاطلاع على [الدليل](https://eslint.interlace.tools/docs/react-a11y)، قم بزيارة [eslint.interlace.tools](https://eslint.interlace.tools). 📚

```bash
npm install eslint-plugin-react-a11y --save-dev
```

## Quick Start

```javascript
// eslint.config.js
import reactA11y from 'eslint-plugin-react-a11y';

export default [reactA11y.configs.recommended];
```

## ⚙️ Configuration Presets

| Preset        | Description                                                                   |
| :------------ | :---------------------------------------------------------------------------- |
| `recommended` | Enables critical accessibility rules (WCAG Level A as errors, AA as warnings) |
| `strict`      | Enforces all rules as errors for maximum WCAG compliance                      |
| `wcag-a`      | Only rules required for WCAG 2.1 Level A compliance                           |
| `wcag-aa`     | Includes Level A + additional rules for Level AA compliance                   |

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

## Rules

**Legend**

| Icon | Description                                                        |
| :--: | :----------------------------------------------------------------- |
|  💼  | **Recommended**: Included in the recommended preset.               |
|  ⚠️  | **Warns**: Set towarn in recommended preset.                       |
|  🔧  | **Auto-fixable**: Automatically fixable by the `--fix` CLI option. |
|  💡  | **Suggestions**: Providing code suggestions in IDE.                |
|  🚫  | **Deprecated**: This rule is deprecated.                           |

| Rule                                                                                                                | WCAG Criterion | Description                                           | 💼  | ⚠️  | 🔧  | 💡  | 🚫  |
| :------------------------------------------------------------------------------------------------------------------ | :------------- | :---------------------------------------------------- | :-: | :-: | :-: | :-: | :-: |
| [`alt-text`](https://eslint.interlace.tools/docs/react-a11y/rules/alt-text)                                         | 1.1.1          | Image missing alt text                                | 💼  |     |     |     |     |
| [`html-has-lang`](https://eslint.interlace.tools/docs/react-a11y/rules/html-has-lang)                               | 3.1.1          | html element missing lang attribute                   | 💼  |     |     |     |     |
| [`iframe-has-title`](https://eslint.interlace.tools/docs/react-a11y/rules/iframe-has-title)                         | 2.4.1          | iframe element missing title                          | 💼  |     |     |     |     |
| [`mouse-events-have-key-events`](https://eslint.interlace.tools/docs/react-a11y/rules/mouse-events-have-key-events) | 2.1.1          | onMouseOver must be accompanied by onFocus            | 💼  |     |     |     |     |
| [`no-access-key`](https://eslint.interlace.tools/docs/react-a11y/rules/no-access-key)                               | 2.1.1          | No access key attribute allowed                       | 💼  |     |     |     |     |
| [`no-autofocus`](https://eslint.interlace.tools/docs/react-a11y/rules/no-autofocus)                                 | 2.4.3          | No autofocus attribute allowed                        | 💼  |     |     |     |     |
| [`no-distracting-elements`](https://eslint.interlace.tools/docs/react-a11y/rules/no-distracting-elements)           | 2.2.2          | Distracting elements (marquee, blink) are not allowed | 💼  |     |     |     |     |
| [`aria-props`](https://eslint.interlace.tools/docs/react-a11y/rules/aria-props)                                     | 4.1.2          | Invalid ARIA attribute                                | 💼  |     |     |     |     |
| [`aria-role`](https://eslint.interlace.tools/docs/react-a11y/rules/aria-role)                                       | 4.1.2          | Invalid ARIA role                                     | 💼  |     |     |     |     |
| [`role-has-required-aria-props`](https://eslint.interlace.tools/docs/react-a11y/rules/role-has-required-aria-props) | 4.1.2          | Role missing required aria props                      | 💼  |     |     |     |     |
| [`aria-unsupported-elements`](https://eslint.interlace.tools/docs/react-a11y/rules/aria-unsupported-elements)       | 4.1.2          | Element does not support ARIA roles/props             | 💼  |     |     |     |     |
| [`click-events-have-key-events`](https://eslint.interlace.tools/docs/react-a11y/rules/click-events-have-key-events) | 2.1.1          | onClick must be accompanied by onKeyUp/KeyDown        | 💼  |     |     |     |     |
| [`heading-has-content`](https://eslint.interlace.tools/docs/react-a11y/rules/heading-has-content)                   | 1.3.1          | Headings must have content                            | 💼  |     |     |     |     |
| [`label-has-associated-control`](https://eslint.interlace.tools/docs/react-a11y/rules/label-has-associated-control) | 3.3.2          | Form label must be associated with a control          | 💼  |     |     |     |     |
| [`tabindex-no-positive`](https://eslint.interlace.tools/docs/react-a11y/rules/tabindex-no-positive)                 | 2.4.3          | Avoid positive tabIndex                               | 💼  |     |     |     |     |

---

## AI-Optimized Messages

This plugin is optimized for ESLint's [Model Context Protocol (MCP)](https://eslint.org/docs/latest/use/mcp), enabling AI assistants like **Cursor**, **GitHub Copilot**, and **Claude** to:

- Understand the exact vulnerability type via CWE references
- Apply the correct fix using structured guidance
- Provide educational context to developers

```bash
src/components/Button.tsx
  12:5   error  🔒 CWE-20 WCAG:4.1.2 CVSS:5.3 | Interactive element missing accessible name | CRITICAL [WCAG 2.1 A]
                    Fix: Add aria-label="Submit Order" or inner text | https://eslint.interlace.tools/...
```

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

By providing this structured context (CWE, OWASP, Fix), we enable AI tools to **reason** about the security flaw rather than hallucinating. This allows Copilot/Cursor to suggest the _exact_ correct fix immediately.

## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint Ecosystem** — AI-native security plugins with LLM-optimized error messages:

| Plugin                                                                                               |                                                                              Downloads                                                                               | Description                                 |
| :--------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :------------------------------------------ |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding)           |      [![downloads](https://img.shields.io/npm/dt/eslint-plugin-secure-coding.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-secure-coding)      | General security rules & OWASP guidelines.  |
| [`eslint-plugin-pg`](https://www.npmjs.com/package/eslint-plugin-pg)                                 |                 [![downloads](https://img.shields.io/npm/dt/eslint-plugin-pg.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-pg)                 | PostgreSQL security & best practices.       |
| [`eslint-plugin-crypto`](https://www.npmjs.com/package/eslint-plugin-crypto)                         |             [![downloads](https://img.shields.io/npm/dt/eslint-plugin-crypto.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-crypto)             | NodeJS Cryptography security rules.         |
| [`eslint-plugin-jwt`](https://www.npmjs.com/package/eslint-plugin-jwt)                               |                [![downloads](https://img.shields.io/npm/dt/eslint-plugin-jwt.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-jwt)                | JWT security & best practices.              |
| [`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security)     |   [![downloads](https://img.shields.io/npm/dt/eslint-plugin-browser-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-browser-security)   | Browser-specific security & XSS prevention. |
| [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-vercel-ai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | Vercel AI SDK security rules.               |
| [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security)     |   [![downloads](https://img.shields.io/npm/dt/eslint-plugin-express-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-express-security)   | Express.js security hardening rules.        |
| [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security)       |    [![downloads](https://img.shields.io/npm/dt/eslint-plugin-lambda-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-lambda-security)    | AWS Lambda security best practices.         |
| [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security)       |    [![downloads](https://img.shields.io/npm/dt/eslint-plugin-nestjs-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-nestjs-security)    | NestJS security rules & patterns.           |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next)               |        [![downloads](https://img.shields.io/npm/dt/eslint-plugin-import-next.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import-next)        | Next-gen import sorting & architecture.     |

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/react-a11y"><img src="https://eslint.interlace.tools/images/og-react-a11y.png" alt="ESLint Interlace Plugin" width="300" /></a>
</p>
