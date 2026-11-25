<p align="center">
  <a href="https://eslint.interlace.tools/docs/quality/plugin-react-a11y?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="90" /></picture></a>
  &nbsp;&nbsp;
  <a href="https://react.dev" target="_blank"><img src="https://eslint.interlace.tools/logos/react.svg" alt="React" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://oxc.rs" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/oxlint-dark.svg"><img src="https://eslint.interlace.tools/logos/oxlint-light.svg" alt="oxlint" height="90" /></picture></a>
  &nbsp;&nbsp;
  <a href="https://eslint.org" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/eslint-dark.svg"><img src="https://eslint.interlace.tools/logos/eslint-light.svg" alt="ESLint" height="90" /></picture></a>
</p>

<p align="center">
  ESLint rules for React accessibility: ARIA, alt text, keyboard interaction and focus management, from WCAG 2.1.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-react-a11y" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-react-a11y.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-react-a11y" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-react-a11y.svg" alt="NPM Downloads" /></a>
  <a href="https://packagephobia.com/result?p=eslint-plugin-react-a11y" target="_blank"><img src="https://badgen.net/packagephobia/install/eslint-plugin-react-a11y" alt="Install Size" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=eslint-plugin-react-a11y" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=eslint-plugin-react-a11y" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/ofri-peretz/eslint" target="_blank"><img src="https://api.securityscorecards.dev/projects/github.com/ofri-peretz/eslint/badge" alt="OpenSSF Scorecard" /></a>
</p>

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/quality/plugin-react-a11y?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y), visit [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y). 📚

<!-- AUTO-GENERATED:INSTALL:START - Do not edit manually -->

```bash
npm install --save-dev eslint eslint-plugin-react-a11y
```

```js
// eslint.config.mjs
import { configs } from 'eslint-plugin-react-a11y';

export default [configs.recommended];
```

`recommended` is the preset to start with. The others are listed under Configuration Presets below.

Using oxlint or Vite+? Install `oxlint-plugin-react-a11y`: the same rules under the same `react-a11y/<rule>` IDs, without ESLint. Its [page](https://www.npmjs.com/package/oxlint-plugin-react-a11y) has the setup.

<!-- AUTO-GENERATED:INSTALL:END -->

## Description

This plugin provides ESLint rules for React accessibility: ARIA, alt text, keyboard interaction and focus management, from WCAG 2.1.

<!-- AUTO-GENERATED:DOCTRINE:START - Do not edit manually -->

- **Why** — a linter nobody reads protects nothing. We would rather miss a finding
  than spend your attention on one that was never real.
- **How** — evidence, not names. A rule fires on what the code *does*, resolved
  through the AST and ESLint's own scope analysis.
- **What** — every finding carries its fix, in prose for a human and as structured
  JSON for an agent. Security rules add a CWE mapping and, where assigned, a CVSS score.

That trade costs recall, and we measure it:
[methodology](https://github.com/ofri-peretz/eslint/blob/main/BENCHMARK-METHODOLOGY.md)
· [results](https://github.com/ofri-peretz/eslint/blob/main/BENCHMARK-RESULTS.md)
· [a false positive is a bug](https://github.com/ofri-peretz/eslint/issues).

<!-- AUTO-GENERATED:DOCTRINE:END -->

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
      'react-a11y/alt-text': 'error',
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
      'react-a11y/alt-text': [
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

## Migrating from eslint-plugin-jsx-a11y

Facts, as measured against eslint-plugin-jsx-a11y 6.10.2.

- **Keep your rule IDs and disable comments.** Register the plugin under the `jsx-a11y` key and every
  shared rule resolves under `jsx-a11y/<rule>`. 35 rule names are the same in both plugins; none is renamed.

  ```javascript
  import reactA11y from 'eslint-plugin-react-a11y';

  export default [
    {
      plugins: { 'jsx-a11y': reactA11y },
      rules: { 'jsx-a11y/alt-text': 'error' },
    },
  ];
  ```

  `// eslint-disable-next-line jsx-a11y/alt-text` keeps working unchanged.
- **Rules that do not exist here:** `aria-proptypes` (a live upstream rule, enabled in both upstream presets).
  A config that enables it throws on load. The deprecated upstream rules `accessible-emoji`, `label-has-for` and
  `no-onchange` are registered as no-ops (`meta.deprecated: true`), so a config that names them loads; they report
  nothing and no preset enables them. `label-has-for` is `replacedBy` `label-has-associated-control`.
- **Options load.** The option objects in upstream's `recommended` and `strict` presets load without error
  (`includeRoles`, `allowExpressionValues`, element-keyed handler lists, `elements`, `hoverInHandlers`). Which are
  read is listed on each rule's page; `includeRoles` is accepted and read by nothing, as upstream.
- **`settings['jsx-a11y']` is not read yet.** `components`, `polymorphicPropName`, `polymorphicAllowList` and
  `attributes` are ignored by every rule. Use the per-rule options (`components`, `controlComponents`, ...) instead.
- **The presets use the `react-a11y/` prefix** and are not aliased to `jsx-a11y/`. `configs.recommended` and
  `flatConfigs.recommended` (also `strict`) are the same object, keyed `react-a11y`; spreading one next to a plugin
  registered as `jsx-a11y` enables the rules under both prefixes. Each preset sets
  `languageOptions.parserOptions.ecmaFeatures.jsx`.
- **Severities differ.** `recommended` here is `error` for WCAG Level A rules and `warn` for the rest;
  upstream's is `error` for nearly every rule, with per-rule options that these presets do not carry.

## 📦 Compatibility
| Package | Version |
| :--- | :--- |
| ESLint | `^8.40.0 \|\| ^9.0.0 \|\| ^10.0.0` |
| Node.js | `>=22.13.0` |

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
| [accessible-emoji](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/accessible-emoji?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | Deprecated no-op kept so eslint-plugin-jsx-a11y configs naming it load; it reports nothing. | 🟢 |  |  |  |  | 🚫 |
| [alt-text](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/alt-text?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | Enforce alt text on images and other visual elements that carry accessibility impact. | 🟢 | 💼 |  |  | 💡 |  |
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
| [label-has-for](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/label-has-for?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | Deprecated no-op kept so eslint-plugin-jsx-a11y configs naming it load; it reports nothing. | 🟢 |  |  |  |  | 🚫 |
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
| [no-onchange](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/no-onchange?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | Deprecated no-op kept so eslint-plugin-jsx-a11y configs naming it load; it reports nothing. | 🟢 |  |  |  |  | 🚫 |
| [no-redundant-roles](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/no-redundant-roles?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | no-redundant-roles rule | 🟢 |  | ⚠️ |  | 💡 |  |
| [no-static-element-interactions](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/no-static-element-interactions?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | no-static-element-interactions rule | 🟢 |  | ⚠️ |  | 💡 |  |
| [prefer-tag-over-role](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/prefer-tag-over-role?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | prefer-tag-over-role rule | 🟢 |  | ⚠️ |  | 💡 |  |
| [role-has-required-aria-props](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/role-has-required-aria-props?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | role-has-required-aria-props rule | 🟢 | 💼 |  |  | 💡 |  |
| [role-supports-aria-props](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/role-supports-aria-props?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | role-supports-aria-props rule | 🟢 | 💼 |  |  | 💡 |  |
| [scope](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/scope?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | scope rule | 🟢 | 💼 |  |  | 💡 |  |
| [tabindex-no-positive](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/tabindex-no-positive?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y) |  |  |  | tabindex-no-positive rule | 🟢 |  | ⚠️ |  | 💡 |  |
<!-- AUTO-GENERATED:RULES_TABLE:END -->
<!-- AUTO-GENERATED:ECOSYSTEM_TABLE:START - Do not edit manually -->

## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint ecosystem** — AI-native rules with LLM-optimized error messages:

**Security**

| Plugin | Downloads | Description |
| :--- | :---: | :--- |
| [`eslint-plugin-anthropic-security`](https://www.npmjs.com/package/eslint-plugin-anthropic-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-anthropic-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-anthropic-security) | Anthropic SDK security. |
| [`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-browser-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-browser-security) | XSS, DOM security. |
| [`eslint-plugin-drizzle-security`](https://www.npmjs.com/package/eslint-plugin-drizzle-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-drizzle-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-drizzle-security) | Drizzle security. |
| [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-express-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-express-security) | Express middleware hardening. |
| [`eslint-plugin-gemini-security`](https://www.npmjs.com/package/eslint-plugin-gemini-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-gemini-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-gemini-security) | Google Gemini SDK security. |
| [`eslint-plugin-jwt-security`](https://www.npmjs.com/package/eslint-plugin-jwt-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-jwt-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-jwt-security) | Token security. |
| [`eslint-plugin-knex-security`](https://www.npmjs.com/package/eslint-plugin-knex-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-knex-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-knex-security) | Knex security. |
| [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-lambda-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-lambda-security) | AWS Lambda hardening. |
| [`eslint-plugin-mcp-sdk-security`](https://www.npmjs.com/package/eslint-plugin-mcp-sdk-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-mcp-sdk-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-mcp-sdk-security) | MCP SDK security. |
| [`eslint-plugin-mongodb-security`](https://www.npmjs.com/package/eslint-plugin-mongodb-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-mongodb-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-mongodb-security) | MongoDB injection. |
| [`eslint-plugin-mysql-security`](https://www.npmjs.com/package/eslint-plugin-mysql-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-mysql-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-mysql-security) | MySQL security. |
| [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-nestjs-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | NestJS framework hardening. |
| [`eslint-plugin-node-security`](https://www.npmjs.com/package/eslint-plugin-node-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-node-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-node-security) | Server-side patterns. |
| [`eslint-plugin-openai-security`](https://www.npmjs.com/package/eslint-plugin-openai-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-openai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-openai-security) | OpenAI SDK security. |
| [`eslint-plugin-postgresql-security`](https://www.npmjs.com/package/eslint-plugin-postgresql-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-postgresql-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-postgresql-security) | PostgreSQL security. |
| [`eslint-plugin-prisma-security`](https://www.npmjs.com/package/eslint-plugin-prisma-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-prisma-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-prisma-security) | Prisma security. |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-secure-coding.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-secure-coding) | Injection prevention. |
| [`eslint-plugin-sequelize-security`](https://www.npmjs.com/package/eslint-plugin-sequelize-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-sequelize-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-sequelize-security) | Sequelize ORM security. |
| [`eslint-plugin-sqlite-security`](https://www.npmjs.com/package/eslint-plugin-sqlite-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-sqlite-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-sqlite-security) | SQLite security. |
| [`eslint-plugin-supabase-security`](https://www.npmjs.com/package/eslint-plugin-supabase-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-supabase-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-supabase-security) | Supabase security. |
| [`eslint-plugin-typeorm-security`](https://www.npmjs.com/package/eslint-plugin-typeorm-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-typeorm-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-typeorm-security) | TypeORM security. |
| [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-vercel-ai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | AI SDK security. |

**Code quality**

| Plugin | Downloads | Description |
| :--- | :---: | :--- |
| [`eslint-plugin-conventions`](https://www.npmjs.com/package/eslint-plugin-conventions) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-conventions.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-conventions) | Team-specific habits and styles. |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-import-next.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import-next) | Fast cycle + import-graph analysis. |
| [`eslint-plugin-maintainability`](https://www.npmjs.com/package/eslint-plugin-maintainability) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-maintainability.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-maintainability) | Cognitive load and clean-code patterns. |
| [`eslint-plugin-modernization`](https://www.npmjs.com/package/eslint-plugin-modernization) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-modernization.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-modernization) | ESNext migration + syntax evolution. |
| [`eslint-plugin-modularity`](https://www.npmjs.com/package/eslint-plugin-modularity) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-modularity.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-modularity) | Structural integrity and DDD patterns. |
| [`eslint-plugin-operability`](https://www.npmjs.com/package/eslint-plugin-operability) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-operability.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-operability) | Production readiness and resource health. |
| [`eslint-plugin-react-features`](https://www.npmjs.com/package/eslint-plugin-react-features) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-react-features.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-react-features) | React best practices and optimization. |
| [`eslint-plugin-reliability`](https://www.npmjs.com/package/eslint-plugin-reliability) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-reliability.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-reliability) | Runtime stability and error safety. |

<!-- AUTO-GENERATED:ECOSYSTEM_TABLE:END -->

<!-- INTERLACE:STAR_CTA:START -->

## Support

Found a false positive? [Open an issue](https://github.com/ofri-peretz/eslint/issues): that is a bug. If the plugin helped, a star on [ofri-peretz/eslint](https://github.com/ofri-peretz/eslint) helps others find it.

<!-- INTERLACE:STAR_CTA:END -->

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/quality/plugin-react-a11y?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y"><img src="https://eslint.interlace.tools/images/og-react-a11y.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>

<p align="center">
  <a href="https://eslint.interlace.tools/docs/quality/plugin-react-a11y?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-react-a11y" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="70" /></picture></a>
</p>
