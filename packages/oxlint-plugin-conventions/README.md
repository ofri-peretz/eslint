<p align="center">
  <a href="https://eslint.interlace.tools/docs/quality/plugin-conventions?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-conventions" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="90" /></picture></a>
  &nbsp;&nbsp;
  <a href="https://oxc.rs" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/oxlint-dark.svg"><img src="https://eslint.interlace.tools/logos/oxlint-light.svg" alt="oxlint" height="90" /></picture></a>
</p>

<p align="center">
  Project conventions: naming, file structure, and code style consistency.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/oxlint-plugin-conventions" target="_blank"><img src="https://img.shields.io/npm/v/oxlint-plugin-conventions.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/oxlint-plugin-conventions" target="_blank"><img src="https://img.shields.io/npm/dm/oxlint-plugin-conventions.svg" alt="NPM Downloads" /></a>
  <a href="https://packagephobia.com/result?p=oxlint-plugin-conventions" target="_blank"><img src="https://badgen.net/packagephobia/install/oxlint-plugin-conventions" alt="Install Size" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=eslint-plugin-conventions" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=eslint-plugin-conventions" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/ofri-peretz/eslint" target="_blank"><img src="https://api.securityscorecards.dev/projects/github.com/ofri-peretz/eslint/badge" alt="OpenSSF Scorecard" /></a>
</p>

> ⭐ If this plugin caught a real bug for you, [**star the repo**](https://github.com/ofri-peretz/eslint) — it's the signal that keeps these rules maintained.

## Description

`oxlint-plugin-conventions` is the [oxlint](https://oxc.rs/docs/guide/usage/linter/js-plugins) and [Vite+](https://viteplus.dev/guide/lint) name for [`eslint-plugin-conventions`](https://www.npmjs.com/package/eslint-plugin-conventions). It carries the same rules under the same IDs (`conventions/<rule>`), always at the same version, because it re-exports that package rather than copying it. Installing it does not install ESLint.

## Covered natively by oxlint

oxlint already ships 6 of these 15 rules as built-ins. Enable the built-in instead: it is the same check, runs natively, and running both would report every finding twice. Each rule carries the mapping as `meta.interop.nativeEquivalent`.

| This plugin                                    | oxlint built-in                            |
| :--------------------------------------------- | :----------------------------------------- |
| `conventions/consistent-existence-index-check` | `unicorn/consistent-existence-index-check` |
| `conventions/filename-case`                    | `unicorn/filename-case`                    |
| `conventions/no-console-spaces`                | `unicorn/no-console-spaces`                |
| `conventions/no-magic-numbers`                 | `eslint/no-magic-numbers`                  |
| `conventions/prefer-code-point`                | `unicorn/prefer-code-point`                |
| `conventions/prefer-dom-node-text-content`     | `unicorn/prefer-dom-node-text-content`     |

What this package adds to oxlint is the other 9: every rule in the table below that is not listed here.

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
npm install oxlint-plugin-conventions --save-dev
```

### Vite+

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: ['oxlint-plugin-conventions'],
    rules: {
      'conventions/analytics-event-naming': 'error',
      'conventions/no-raw-cross-property-href': 'error',
      'conventions/utm-taxonomy': 'error',
    },
  },
});
```

### oxlint

```json
{
  "jsPlugins": ["oxlint-plugin-conventions"],
  "rules": {
    "conventions/analytics-event-naming": "error",
    "conventions/no-raw-cross-property-href": "error",
    "conventions/utm-taxonomy": "error"
  }
}
```

These are the rules the plugin recommends (💼 in the table below), minus the ones oxlint already ships natively.

### ESLint

Install [`eslint-plugin-conventions`](https://www.npmjs.com/package/eslint-plugin-conventions) instead. It has the same rules, plus presets for ESLint's flat config.

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

| Rule                                                                                                                                                                                                                       |   CWE    | OWASP | CVSS | Description                                                                                                  | 🧠  | 💼  | ⚠️  | 🔧  | 💡  | 🚫  |
| :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------: | :---: | :--: | :----------------------------------------------------------------------------------------------------------- | :-: | :-: | :-: | :-: | :-: | :-: |
| [analytics-event-naming](https://eslint.interlace.tools/docs/quality/plugin-conventions/rules/analytics-event-naming?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-conventions)                         |          |       |      | Analytics event names (track/capture) must follow ANALYTICS_PHILOSOPHY.md principle 4: lowercase snake_case… | 🟢  | 💼  |     |     |     |     |
| [consistent-existence-index-check](https://eslint.interlace.tools/docs/quality/plugin-conventions/rules/consistent-existence-index-check?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-conventions)     |          |       |      | Enforce one form for checking whether an object has a property                                               | 🟢  |     |     |     | 💡  |     |
| [expiring-todo-comments](https://eslint.interlace.tools/docs/quality/plugin-conventions/rules/expiring-todo-comments?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-conventions)                         |          |       |      | Add expiration conditions to TODO comments to prevent forgotten tasks. This rule is part of eslint-plugin-c… | 🟢  |     | ⚠️  |     | 💡  |     |
| [filename-case](https://eslint.interlace.tools/docs/quality/plugin-conventions/rules/filename-case?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-conventions)                                           |          |       |      | Enforce filename case conventions for consistency across your codebase                                       | 🟢  |     |     |     | 💡  |     |
| [no-commented-code](https://eslint.interlace.tools/docs/quality/plugin-conventions/rules/no-commented-code?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-conventions)                                   |          |       |      | ESLint Rule: no-commented-code with LLM-optimized suggestions and auto-fix capabilities.                     | 🟢  |     | ⚠️  |     | 💡  |     |
| [no-console-spaces](https://eslint.interlace.tools/docs/quality/plugin-conventions/rules/no-console-spaces?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-conventions)                                   |          |       |      | Disallow leading/trailing whitespace in console arguments. This rule is part of eslint-plugin-conventions.   | 🟢  |     |     |     | 💡  |     |
| [no-deprecated-api](https://eslint.interlace.tools/docs/quality/plugin-conventions/rules/no-deprecated-api?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-conventions)                                   | CWE-1078 |       |      | Prevent usage of deprecated APIs with migration context and timeline. This rule is part of eslint-plugin-co… | 🟢  |     | ⚠️  |     | 💡  |     |
| [no-json-schema-tags](https://eslint.interlace.tools/docs/quality/plugin-conventions/rules/no-json-schema-tags?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-conventions)                               |          |       |      | Disallow JSON Schema keywords (e.g. @minimum, @maximum, @pattern, @format) used as JSDoc tags.               | 🟢  |     |     |     | 💡  |     |
| [no-magic-numbers](https://eslint.interlace.tools/docs/quality/plugin-conventions/rules/no-magic-numbers?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-conventions)                                     |          |       |      | Disallow magic numbers (numeric literals without a named constant)                                           | 🟢  |     |     |     | 💡  |     |
| [no-raw-cross-property-href](https://eslint.interlace.tools/docs/quality/plugin-conventions/rules/no-raw-cross-property-href?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-conventions)                 |          |       |      | Forbid hand-written cross-property hrefs; use buildUtmHref() from lib/utm.ts                                 | 🟢  | 💼  |     |     |     |     |
| [prefer-code-point](https://eslint.interlace.tools/docs/quality/plugin-conventions/rules/prefer-code-point?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-conventions)                                   |          |       |      | Prefer String.codePointAt() over String.charCodeAt(). This rule is part of eslint-plugin-conventions.        | 🟢  |     |     |     | 💡  |     |
| [prefer-dependency-version-strategy](https://eslint.interlace.tools/docs/quality/plugin-conventions/rules/prefer-dependency-version-strategy?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-conventions) |          |       |      | Enforce consistent version strategy (caret ^, tilde ~, exact, range, or any) for package.json dependencies.… | 🟢  |     |     |     | 💡  |     |
| [prefer-dom-node-text-content](https://eslint.interlace.tools/docs/quality/plugin-conventions/rules/prefer-dom-node-text-content?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-conventions)             |          |       |      | Prefer textContent over innerText. This rule is part of eslint-plugin-conventions.                           | 🟢  |     |     |     | 💡  |     |
| [require-data-testid](https://eslint.interlace.tools/docs/quality/plugin-conventions/rules/require-data-testid?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-conventions)                               |          |       |      | Require stable data-testid attributes on interactive elements for end-to-end test reliability                | 🟢  |     |     |     | 💡  |     |
| [utm-taxonomy](https://eslint.interlace.tools/docs/quality/plugin-conventions/rules/utm-taxonomy?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-conventions)                                             |          |       |      | Validate utm_source and utm_medium values against the fixed taxonomy in UTM_PHILOSOPHY.md                    | 🟢  | 💼  |     |     |     |     |

## ⭐ Support & follow

If this plugin caught a real bug for you, **[star the repo](https://github.com/ofri-peretz/eslint)** — stars are the signal that keeps the Interlace ESLint ecosystem maintained — and **[follow the writeups on Dev.to](https://dev.to/ofri-peretz)** for the benchmarks and security research behind these rules.

[![GitHub stars](https://img.shields.io/github/stars/ofri-peretz/eslint?style=social)](https://github.com/ofri-peretz/eslint)

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/quality/plugin-conventions?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-conventions"><img src="https://eslint.interlace.tools/images/og-conventions.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>

<p align="center">
  <a href="https://eslint.interlace.tools/docs/quality/plugin-conventions?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-conventions" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="70" /></picture></a>
</p>
