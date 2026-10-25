<p align="center">
  <a href="https://eslint.interlace.tools/docs/quality/plugin-react-a11y?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-react-a11y" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="90" /></picture></a>
  &nbsp;&nbsp;
  <a href="https://react.dev" target="_blank"><img src="https://eslint.interlace.tools/logos/react.svg" alt="React" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://oxc.rs" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/oxlint-dark.svg"><img src="https://eslint.interlace.tools/logos/oxlint-light.svg" alt="oxlint" height="90" /></picture></a>
</p>

<p align="center">
  Accessibility (a11y) rules for React applications, enforcing WCAG standards.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/oxlint-plugin-react-a11y" target="_blank"><img src="https://img.shields.io/npm/v/oxlint-plugin-react-a11y.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/oxlint-plugin-react-a11y" target="_blank"><img src="https://img.shields.io/npm/dm/oxlint-plugin-react-a11y.svg" alt="NPM Downloads" /></a>
  <a href="https://packagephobia.com/result?p=oxlint-plugin-react-a11y" target="_blank"><img src="https://badgen.net/packagephobia/install/oxlint-plugin-react-a11y" alt="Install Size" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=eslint-plugin-react-a11y" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=eslint-plugin-react-a11y" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/ofri-peretz/eslint" target="_blank"><img src="https://api.securityscorecards.dev/projects/github.com/ofri-peretz/eslint/badge" alt="OpenSSF Scorecard" /></a>
</p>

> ⭐ If this plugin caught a real bug for you, [**star the repo**](https://github.com/ofri-peretz/eslint) — it's the signal that keeps these rules maintained.

## Description

`oxlint-plugin-react-a11y` is the [oxlint](https://oxc.rs/docs/guide/usage/linter/js-plugins) and [Vite+](https://viteplus.dev/guide/lint) name for [`eslint-plugin-react-a11y`](https://www.npmjs.com/package/eslint-plugin-react-a11y). It carries the same rules under the same IDs (`react-a11y/<rule>`), always at the same version, because it re-exports that package rather than copying it. Installing it does not install ESLint.

## Covered natively by oxlint

oxlint already ships 35 of these 37 rules as built-ins. Enable the built-in instead: it is the same check, runs natively, and running both would report every finding twice. Each rule carries the mapping as `meta.interop.nativeEquivalent`.

| This plugin                                                | oxlint built-in                                          |
| :--------------------------------------------------------- | :------------------------------------------------------- |
| `react-a11y/alt-text`                                      | `jsx_a11y/alt-text`                                      |
| `react-a11y/anchor-ambiguous-text`                         | `jsx_a11y/anchor-ambiguous-text`                         |
| `react-a11y/anchor-has-content`                            | `jsx_a11y/anchor-has-content`                            |
| `react-a11y/anchor-is-valid`                               | `jsx_a11y/anchor-is-valid`                               |
| `react-a11y/aria-activedescendant-has-tabindex`            | `jsx_a11y/aria-activedescendant-has-tabindex`            |
| `react-a11y/aria-props`                                    | `jsx_a11y/aria-props`                                    |
| `react-a11y/aria-role`                                     | `jsx_a11y/aria-role`                                     |
| `react-a11y/aria-unsupported-elements`                     | `jsx_a11y/aria-unsupported-elements`                     |
| `react-a11y/autocomplete-valid`                            | `jsx_a11y/autocomplete-valid`                            |
| `react-a11y/click-events-have-key-events`                  | `jsx_a11y/click-events-have-key-events`                  |
| `react-a11y/control-has-associated-label`                  | `jsx_a11y/control-has-associated-label`                  |
| `react-a11y/heading-has-content`                           | `jsx_a11y/heading-has-content`                           |
| `react-a11y/html-has-lang`                                 | `jsx_a11y/html-has-lang`                                 |
| `react-a11y/iframe-has-title`                              | `jsx_a11y/iframe-has-title`                              |
| `react-a11y/img-redundant-alt`                             | `jsx_a11y/img-redundant-alt`                             |
| `react-a11y/interactive-supports-focus`                    | `jsx_a11y/interactive-supports-focus`                    |
| `react-a11y/label-has-associated-control`                  | `jsx_a11y/label-has-associated-control`                  |
| `react-a11y/lang`                                          | `jsx_a11y/lang`                                          |
| `react-a11y/media-has-caption`                             | `jsx_a11y/media-has-caption`                             |
| `react-a11y/mouse-events-have-key-events`                  | `jsx_a11y/mouse-events-have-key-events`                  |
| `react-a11y/no-access-key`                                 | `jsx_a11y/no-access-key`                                 |
| `react-a11y/no-aria-hidden-on-focusable`                   | `jsx_a11y/no-aria-hidden-on-focusable`                   |
| `react-a11y/no-autofocus`                                  | `jsx_a11y/no-autofocus`                                  |
| `react-a11y/no-distracting-elements`                       | `jsx_a11y/no-distracting-elements`                       |
| `react-a11y/no-interactive-element-to-noninteractive-role` | `jsx_a11y/no-interactive-element-to-noninteractive-role` |
| `react-a11y/no-noninteractive-element-interactions`        | `jsx_a11y/no-noninteractive-element-interactions`        |
| `react-a11y/no-noninteractive-element-to-interactive-role` | `jsx_a11y/no-noninteractive-element-to-interactive-role` |
| `react-a11y/no-noninteractive-tabindex`                    | `jsx_a11y/no-noninteractive-tabindex`                    |
| `react-a11y/no-redundant-roles`                            | `jsx_a11y/no-redundant-roles`                            |
| `react-a11y/no-static-element-interactions`                | `jsx_a11y/no-static-element-interactions`                |
| `react-a11y/prefer-tag-over-role`                          | `jsx_a11y/prefer-tag-over-role`                          |
| `react-a11y/role-has-required-aria-props`                  | `jsx_a11y/role-has-required-aria-props`                  |
| `react-a11y/role-supports-aria-props`                      | `jsx_a11y/role-supports-aria-props`                      |
| `react-a11y/scope`                                         | `jsx_a11y/scope`                                         |
| `react-a11y/tabindex-no-positive`                          | `jsx_a11y/tabindex-no-positive`                          |

What this package adds to oxlint is the other 2: every rule in the table below that is not listed here.

- **Why** — a linter nobody reads protects nothing. We would rather miss a finding
  than spend your attention on one that was never real.
- **How** — evidence, not names. A rule fires on what the code _does_, resolved
  through the AST and ESLint's own scope analysis.
- **What** — every finding carries its fix, in prose for a human and as structured
  JSON for an agent. Security rules add a CWE mapping and, where assigned, a CVSS score.

That trade costs recall, and we measure it:
[methodology](https://github.com/ofri-peretz/eslint/blob/main/BENCHMARK-METHODOLOGY.md)
· [results](https://github.com/ofri-peretz/eslint/blob/main/BENCHMARK-RESULTS.md)
· [a false positive is a bug](https://github.com/ofri-peretz/eslint/issues).

## Getting Started

```bash
npm install oxlint-plugin-react-a11y --save-dev
```

### Vite+

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: ['oxlint-plugin-react-a11y'],
    rules: {
      'react-a11y/no-keyboard-inaccessible-elements': 'error',
    },
  },
});
```

### oxlint

```json
{
  "jsPlugins": ["oxlint-plugin-react-a11y"],
  "rules": {
    "react-a11y/no-keyboard-inaccessible-elements": "error"
  }
}
```

These are the rules the plugin recommends (💼 in the table below), minus the ones oxlint already ships natively.

### ESLint

Install [`eslint-plugin-react-a11y`](https://www.npmjs.com/package/eslint-plugin-react-a11y) instead. It has the same rules, plus presets for ESLint's flat config.

## 📦 Compatibility

| Package | Version                                                          |
| :------ | :--------------------------------------------------------------- |
| oxlint  | verified on `1.88.0`: CI loads every rule ID through `jsPlugins` |
| Vite+   | `lint.jsPlugins` in `vite.config.ts`                             |
| Node.js | `>=18.0.0`                                                       |

## Rules

**Legend**

| Icon | Description                                                               |
| :--: | :------------------------------------------------------------------------ |
|  💼  | **Recommended**: Included in the recommended preset.                      |
|  ⚠️  | **Warns**: Set to warn in recommended preset.                             |
|  🔧  | **Auto-fixable**: Automatically fixable by the `--fix` CLI option.        |
|  💡  | **Suggestions**: Providing code suggestions in IDE.                       |
|  🚫  | **Deprecated**: This rule is deprecated.                                  |
|  🟢  | **Type-unaware**: AST-only, runs in oxlint JS-plugin tier.                |
|  🟡  | **Type-aware (refining)**: pure-AST primary path; types refine precision. |
|  🟠  | **Type-aware (graceful)**: requires TS program; silent without it.        |

| Rule                                                                                                                                                                                                                                           |   CWE   | OWASP | CVSS | Description                                                                           | 🧠  | 💼  | ⚠️  | 🔧  | 💡  | 🚫  |
| :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-----: | :---: | :--: | :------------------------------------------------------------------------------------ | :-: | :-: | :-: | :-: | :-: | :-: |
| [alt-text](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/alt-text?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-react-a11y)                                                                           | CWE-252 |       |      | Enforce alt text on images and other visual elements that carry accessibility impact. | 🟢  | 💼  |     |     | 💡  |     |
| [anchor-ambiguous-text](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/anchor-ambiguous-text?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-react-a11y)                                                 |         |       |      | anchor-ambiguous-text rule                                                            | 🟢  |     | ⚠️  |     | 💡  |     |
| [anchor-has-content](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/anchor-has-content?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-react-a11y)                                                       |         |       |      | anchor-has-content rule                                                               | 🟢  | 💼  |     |     | 💡  |     |
| [anchor-is-valid](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/anchor-is-valid?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-react-a11y)                                                             |         |       |      | anchor-is-valid rule                                                                  | 🟢  |     | ⚠️  |     | 💡  |     |
| [aria-activedescendant-has-tabindex](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/aria-activedescendant-has-tabindex?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-react-a11y)                       |         |       |      | aria-activedescendant-has-tabindex rule                                               | 🟢  |     | ⚠️  |     | 💡  |     |
| [aria-props](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/aria-props?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-react-a11y)                                                                       |         |       |      | aria-props rule                                                                       | 🟢  | 💼  |     |     | 💡  |     |
| [aria-role](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/aria-role?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-react-a11y)                                                                         |         |       |      | aria-role rule                                                                        | 🟢  | 💼  |     |     | 💡  |     |
| [aria-unsupported-elements](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/aria-unsupported-elements?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-react-a11y)                                         |         |       |      | aria-unsupported-elements rule                                                        | 🟢  | 💼  |     |     | 💡  |     |
| [autocomplete-valid](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/autocomplete-valid?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-react-a11y)                                                       |         |       |      | autocomplete-valid rule                                                               | 🟢  |     | ⚠️  |     | 💡  |     |
| [click-events-have-key-events](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/click-events-have-key-events?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-react-a11y)                                   |         |       |      | click-events-have-key-events rule                                                     | 🟢  | 💼  |     |     | 💡  |     |
| [control-has-associated-label](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/control-has-associated-label?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-react-a11y)                                   |         |       |      | control-has-associated-label rule                                                     | 🟢  |     | ⚠️  |     | 💡  |     |
| [heading-has-content](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/heading-has-content?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-react-a11y)                                                     |         |       |      | heading-has-content rule                                                              | 🟢  | 💼  |     |     | 💡  |     |
| [html-has-lang](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/html-has-lang?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-react-a11y)                                                                 |         |       |      | html-has-lang rule                                                                    | 🟢  | 💼  |     |     | 💡  |     |
| [iframe-has-title](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/iframe-has-title?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-react-a11y)                                                           |         |       |      | iframe-has-title rule                                                                 | 🟢  | 💼  |     |     | 💡  |     |
| [img-redundant-alt](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/img-redundant-alt?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-react-a11y)                                                         |         |       |      | img-redundant-alt rule                                                                | 🟢  |     | ⚠️  |     | 💡  |     |
| [interactive-supports-focus](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/interactive-supports-focus?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-react-a11y)                                       |         |       |      | interactive-supports-focus rule                                                       | 🟢  | 💼  |     |     | 💡  |     |
| [label-has-associated-control](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/label-has-associated-control?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-react-a11y)                                   |         |       |      | label-has-associated-control rule                                                     | 🟢  |     | ⚠️  |     | 💡  |     |
| [lang](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/lang?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-react-a11y)                                                                                   |         |       |      | lang rule                                                                             | 🟢  | 💼  |     |     | 💡  |     |
| [media-has-caption](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/media-has-caption?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-react-a11y)                                                         |         |       |      | media-has-caption rule                                                                | 🟢  |     | ⚠️  |     | 💡  |     |
| [mouse-events-have-key-events](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/mouse-events-have-key-events?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-react-a11y)                                   |         |       |      | mouse-events-have-key-events rule                                                     | 🟢  |     | ⚠️  |     | 💡  |     |
| [no-access-key](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/no-access-key?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-react-a11y)                                                                 |         |       |      | no-access-key rule                                                                    | 🟢  |     | ⚠️  |     | 💡  |     |
| [no-aria-hidden-on-focusable](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/no-aria-hidden-on-focusable?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-react-a11y)                                     |         |       |      | no-aria-hidden-on-focusable rule                                                      | 🟢  | 💼  |     |     | 💡  |     |
| [no-autofocus](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/no-autofocus?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-react-a11y)                                                                   |         |       |      | no-autofocus rule                                                                     | 🟢  |     | ⚠️  |     | 💡  |     |
| [no-distracting-elements](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/no-distracting-elements?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-react-a11y)                                             |         |       |      | no-distracting-elements rule                                                          | 🟢  | 💼  |     |     | 💡  |     |
| [no-interactive-element-to-noninteractive-role](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/no-interactive-element-to-noninteractive-role?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-react-a11y) |         |       |      | no-interactive-element-to-noninteractive-role rule                                    | 🟢  |     | ⚠️  |     | 💡  |     |
| [no-keyboard-inaccessible-elements](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/no-keyboard-inaccessible-elements?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-react-a11y)                         |         |       |      | no-keyboard-inaccessible-elements rule                                                | 🟢  | 💼  |     |     | 💡  |     |
| [no-missing-aria-labels](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/no-missing-aria-labels?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-react-a11y)                                               |         |       |      | no-missing-aria-labels rule                                                           | 🟢  |     | ⚠️  |     | 💡  |     |
| [no-noninteractive-element-interactions](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/no-noninteractive-element-interactions?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-react-a11y)               |         |       |      | no-noninteractive-element-interactions rule                                           | 🟢  |     | ⚠️  |     | 💡  |     |
| [no-noninteractive-element-to-interactive-role](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/no-noninteractive-element-to-interactive-role?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-react-a11y) |         |       |      | no-noninteractive-element-to-interactive-role rule                                    | 🟢  |     | ⚠️  |     | 💡  |     |
| [no-noninteractive-tabindex](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/no-noninteractive-tabindex?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-react-a11y)                                       |         |       |      | no-noninteractive-tabindex rule                                                       | 🟢  |     | ⚠️  |     | 💡  |     |
| [no-redundant-roles](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/no-redundant-roles?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-react-a11y)                                                       |         |       |      | no-redundant-roles rule                                                               | 🟢  |     | ⚠️  |     | 💡  |     |
| [no-static-element-interactions](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/no-static-element-interactions?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-react-a11y)                               |         |       |      | no-static-element-interactions rule                                                   | 🟢  |     | ⚠️  |     | 💡  |     |
| [prefer-tag-over-role](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/prefer-tag-over-role?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-react-a11y)                                                   |         |       |      | prefer-tag-over-role rule                                                             | 🟢  |     | ⚠️  |     | 💡  |     |
| [role-has-required-aria-props](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/role-has-required-aria-props?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-react-a11y)                                   |         |       |      | role-has-required-aria-props rule                                                     | 🟢  | 💼  |     |     | 💡  |     |
| [role-supports-aria-props](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/role-supports-aria-props?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-react-a11y)                                           |         |       |      | role-supports-aria-props rule                                                         | 🟢  | 💼  |     |     | 💡  |     |
| [scope](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/scope?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-react-a11y)                                                                                 |         |       |      | scope rule                                                                            | 🟢  | 💼  |     |     | 💡  |     |
| [tabindex-no-positive](https://eslint.interlace.tools/docs/quality/plugin-react-a11y/rules/tabindex-no-positive?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-react-a11y)                                                   |         |       |      | tabindex-no-positive rule                                                             | 🟢  |     | ⚠️  |     | 💡  |     |

## ⭐ Support & follow

If this plugin caught a real bug for you, **[star the repo](https://github.com/ofri-peretz/eslint)** — stars are the signal that keeps the Interlace ESLint ecosystem maintained — and **[follow the writeups on Dev.to](https://dev.to/ofri-peretz)** for the benchmarks and security research behind these rules.

[![GitHub stars](https://img.shields.io/github/stars/ofri-peretz/eslint?style=social)](https://github.com/ofri-peretz/eslint)

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/quality/plugin-react-a11y?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-react-a11y"><img src="https://eslint.interlace.tools/images/og-react-a11y.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>

<p align="center">
  <a href="https://eslint.interlace.tools/docs/quality/plugin-react-a11y?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-react-a11y" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="70" /></picture></a>
</p>
