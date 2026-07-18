<p align="center">
  <a href="https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y" target="blank"><img src="https://eslint.interlace.tools/eslint-interlace-logo-light.svg" alt="ESLint Interlace Logo" width="120" /></a>
</p>

<p align="center">
  Accessibility (a11y) rules for React applications, enforcing WCAG standards.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-react-a11y" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-react-a11y.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-react-a11y" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-react-a11y.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=eslint-plugin-react-a11y" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=eslint-plugin-react-a11y" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
</p>

> ⭐ If this plugin caught a real bug for you, [**star the repo**](https://github.com/ofri-peretz/eslint) — it's the signal that keeps these rules maintained.

## Description

This plugin provides Accessibility (a11y) rules for React applications, enforcing WCAG standards.

## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/quality/plugin-react-a11y?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y), visit [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/quality/plugin-react-a11y?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y). 📚
- [가이드](https://eslint.interlace.tools/docs/quality/plugin-react-a11y?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/quality/plugin-react-a11y?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y)は [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y)でご確認ください。 📚
- Para ver la [guía](https://eslint.interlace.tools/docs/quality/plugin-react-a11y?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y), visita [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y). 📚
- للاطلاع على [الدليل](https://eslint.interlace.tools/docs/quality/plugin-react-a11y?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y)، قم بزيارة [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y). 📚

```bash
npm install eslint-plugin-react-a11y --save-dev
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

## 📦 Compatibility
| Package | Version |
| :--- | :--- |
| ESLint | `^8.0.0 \|\| ^9.0.0 \|\| ^10.0.0` |
| Node.js | `>=18.0.0` |

See the [ESLint Version Support Policy](../../docs/ESLINT_VERSION_SUPPORT.md) — current ecosystem share data, the 20% gate, and the forward-looking exception that covers v10.

## Rules

**Legend**

| Icon | Description |
| :---: | :--- |
| 💼 | **Recommended**: Included in the recommended preset. |
| ⚠️ | **Warns**: Set to warn in recommended preset. |
| 🔧 | **Auto-fixable**: Automatically fixable by the `--fix` CLI option. |
| 💡 | **Suggestions**: Providing code suggestions in IDE. |
| 🚫 | **Deprecated**: This rule is deprecated. |
| 🟢 | **Type-unaware**: AST-only, runs in oxlint JS-plugin tier. |
| 🟡 | **Type-aware (refining)**: pure-AST primary path; types refine precision. |
| 🟠 | **Type-aware (graceful)**: requires TS program; silent without it. |

<!-- AUTO-GENERATED:RULES_TABLE:START - Do not edit manually -->
| Rule | CWE | OWASP | CVSS | Description | 🧠 | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| [alt-text](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/alt-text?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) | CWE-252 |  |  | Enforce alt text on images and other visual elements that carry accessibility impact. | 🟢 | 💼 |  |  | 💡 |  |
| [anchor-ambiguous-text](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/anchor-ambiguous-text?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | anchor-ambiguous-text rule | 🟢 |  | ⚠️ |  | 💡 |  |
| [anchor-has-content](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/anchor-has-content?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | anchor-has-content rule | 🟢 | 💼 |  |  | 💡 |  |
| [anchor-is-valid](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/anchor-is-valid?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | anchor-is-valid rule | 🟢 |  | ⚠️ |  | 💡 |  |
| [aria-activedescendant-has-tabindex](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/aria-activedescendant-has-tabindex?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | aria-activedescendant-has-tabindex rule | 🟢 |  | ⚠️ |  | 💡 |  |
| [aria-props](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/aria-props?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | aria-props rule | 🟢 | 💼 |  |  | 💡 |  |
| [aria-role](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/aria-role?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | aria-role rule | 🟢 | 💼 |  |  | 💡 |  |
| [aria-unsupported-elements](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/aria-unsupported-elements?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | aria-unsupported-elements rule | 🟢 | 💼 |  |  | 💡 |  |
| [autocomplete-valid](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/autocomplete-valid?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | autocomplete-valid rule | 🟢 |  | ⚠️ |  | 💡 |  |
| [click-events-have-key-events](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/click-events-have-key-events?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | click-events-have-key-events rule | 🟢 | 💼 |  |  | 💡 |  |
| [control-has-associated-label](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/control-has-associated-label?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | control-has-associated-label rule | 🟢 |  | ⚠️ |  | 💡 |  |
| [heading-has-content](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/heading-has-content?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | heading-has-content rule | 🟢 | 💼 |  |  | 💡 |  |
| [html-has-lang](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/html-has-lang?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | html-has-lang rule | 🟢 | 💼 |  |  | 💡 |  |
| [iframe-has-title](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/iframe-has-title?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | iframe-has-title rule | 🟢 | 💼 |  |  | 💡 |  |
| [img-redundant-alt](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/img-redundant-alt?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | img-redundant-alt rule | 🟢 |  | ⚠️ |  | 💡 |  |
| [interactive-supports-focus](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/interactive-supports-focus?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | interactive-supports-focus rule | 🟢 | 💼 |  |  | 💡 |  |
| [label-has-associated-control](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/label-has-associated-control?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | label-has-associated-control rule | 🟢 |  | ⚠️ |  | 💡 |  |
| [lang](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/lang?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | lang rule | 🟢 | 💼 |  |  | 💡 |  |
| [media-has-caption](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/media-has-caption?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | media-has-caption rule | 🟢 |  | ⚠️ |  | 💡 |  |
| [mouse-events-have-key-events](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/mouse-events-have-key-events?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | mouse-events-have-key-events rule | 🟢 |  | ⚠️ |  | 💡 |  |
| [no-access-key](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/no-access-key?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | no-access-key rule | 🟢 |  | ⚠️ |  | 💡 |  |
| [no-aria-hidden-on-focusable](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/no-aria-hidden-on-focusable?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | no-aria-hidden-on-focusable rule | 🟢 | 💼 |  |  | 💡 |  |
| [no-autofocus](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/no-autofocus?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | no-autofocus rule | 🟢 |  | ⚠️ |  | 💡 |  |
| [no-distracting-elements](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/no-distracting-elements?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | no-distracting-elements rule | 🟢 | 💼 |  |  | 💡 |  |
| [no-interactive-element-to-noninteractive-role](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/no-interactive-element-to-noninteractive-role?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | no-interactive-element-to-noninteractive-role rule | 🟢 |  | ⚠️ |  | 💡 |  |
| [no-keyboard-inaccessible-elements](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/no-keyboard-inaccessible-elements?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | no-keyboard-inaccessible-elements rule | 🟢 | 💼 |  |  | 💡 |  |
| [no-missing-aria-labels](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/no-missing-aria-labels?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | no-missing-aria-labels rule | 🟢 |  | ⚠️ |  | 💡 |  |
| [no-noninteractive-element-interactions](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/no-noninteractive-element-interactions?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | no-noninteractive-element-interactions rule | 🟢 |  | ⚠️ |  | 💡 |  |
| [no-noninteractive-element-to-interactive-role](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/no-noninteractive-element-to-interactive-role?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | no-noninteractive-element-to-interactive-role rule | 🟢 |  | ⚠️ |  | 💡 |  |
| [no-noninteractive-tabindex](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/no-noninteractive-tabindex?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | no-noninteractive-tabindex rule | 🟢 |  | ⚠️ |  | 💡 |  |
| [no-redundant-roles](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/no-redundant-roles?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | no-redundant-roles rule | 🟢 |  | ⚠️ |  | 💡 |  |
| [no-static-element-interactions](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/no-static-element-interactions?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | no-static-element-interactions rule | 🟢 |  | ⚠️ |  | 💡 |  |
| [prefer-tag-over-role](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/prefer-tag-over-role?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | prefer-tag-over-role rule | 🟢 |  | ⚠️ |  | 💡 |  |
| [role-has-required-aria-props](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/role-has-required-aria-props?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | role-has-required-aria-props rule | 🟢 | 💼 |  |  | 💡 |  |
| [role-supports-aria-props](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/role-supports-aria-props?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | role-supports-aria-props rule | 🟢 | 💼 |  |  | 💡 |  |
| [scope](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/scope?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | scope rule | 🟢 | 💼 |  |  | 💡 |  |
| [tabindex-no-positive](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/tabindex-no-positive?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | tabindex-no-positive rule | 🟢 |  | ⚠️ |  | 💡 |  |
<!-- AUTO-GENERATED:RULES_TABLE:END -->
## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint Ecosystem** — AI-native security plugins with LLM-optimized error messages:

| Plugin | Downloads | Description |
| :--- | :---: | :--- |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-secure-coding.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-secure-coding) | General security rules & OWASP guidelines. |
| [`eslint-plugin-pg`](https://www.npmjs.com/package/eslint-plugin-pg) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-pg.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-pg) | PostgreSQL security & best practices. |
| [`eslint-plugin-node-security`](https://www.npmjs.com/package/eslint-plugin-node-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-node-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-node-security) | Node.js core-module security (fs, child_process, vm, crypto, Buffer). |
| [`eslint-plugin-jwt`](https://www.npmjs.com/package/eslint-plugin-jwt) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-jwt.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-jwt) | JWT security & best practices. |
| [`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-browser-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-browser-security) | Browser-specific security & XSS prevention. |
| [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-express-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-express-security) | Express.js security hardening rules. |
| [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-lambda-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-lambda-security) | AWS Lambda security best practices. |
| [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-nestjs-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | NestJS security rules & patterns. |
| [`eslint-plugin-mongodb-security`](https://www.npmjs.com/package/eslint-plugin-mongodb-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-mongodb-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-mongodb-security) | MongoDB security best practices. |
| [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-vercel-ai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | Vercel AI SDK security hardening. |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-import-next.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import-next) | Next-gen import sorting & architecture. |

<!-- INTERLACE:STAR_CTA:START -->
## ⭐ Support & follow

If this plugin caught a real bug for you, **[star the repo](https://github.com/ofri-peretz/eslint)** — stars are the signal that keeps the Interlace ESLint ecosystem maintained — and **[follow the writeups on Dev.to](https://dev.to/ofri-peretz)** for the benchmarks and security research behind these rules.

[![GitHub stars](https://img.shields.io/github/stars/ofri-peretz/eslint?style=social)](https://github.com/ofri-peretz/eslint)

<!-- INTERLACE:STAR_CTA:END -->

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/quality/plugin-react-a11y?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y"><img src="https://eslint.interlace.tools/images/og-react-a11y.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>