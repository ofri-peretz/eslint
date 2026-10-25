<p align="center">
  <a href="https://eslint.interlace.tools/docs/quality/plugin-maintainability?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-maintainability" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="90" /></picture></a>
  &nbsp;&nbsp;
  <a href="https://oxc.rs" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/oxlint-dark.svg"><img src="https://eslint.interlace.tools/logos/oxlint-light.svg" alt="oxlint" height="90" /></picture></a>
</p>

<p align="center">
  Maintainability rules — complexity ceilings, dead code, and readability guardrails.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/oxlint-plugin-maintainability" target="_blank"><img src="https://img.shields.io/npm/v/oxlint-plugin-maintainability.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/oxlint-plugin-maintainability" target="_blank"><img src="https://img.shields.io/npm/dm/oxlint-plugin-maintainability.svg" alt="NPM Downloads" /></a>
  <a href="https://packagephobia.com/result?p=oxlint-plugin-maintainability" target="_blank"><img src="https://badgen.net/packagephobia/install/oxlint-plugin-maintainability" alt="Install Size" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=eslint-plugin-maintainability" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=eslint-plugin-maintainability" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/ofri-peretz/eslint" target="_blank"><img src="https://api.securityscorecards.dev/projects/github.com/ofri-peretz/eslint/badge" alt="OpenSSF Scorecard" /></a>
</p>

> ⭐ If this plugin caught a real bug for you, [**star the repo**](https://github.com/ofri-peretz/eslint) — it's the signal that keeps these rules maintained.

## Description

`oxlint-plugin-maintainability` is the [oxlint](https://oxc.rs/docs/guide/usage/linter/js-plugins) and [Vite+](https://viteplus.dev/guide/lint) name for [`eslint-plugin-maintainability`](https://www.npmjs.com/package/eslint-plugin-maintainability). It carries the same rules under the same IDs (`maintainability/<rule>`), always at the same version, because it re-exports that package rather than copying it. Installing it does not install ESLint.

## Covered natively by oxlint

oxlint already ships 5 of these 12 rules as built-ins. Enable the built-in instead: it is the same check, runs natively, and running both would report every finding twice. Each rule carries the mapping as `meta.interop.nativeEquivalent`.

| This plugin                                   | oxlint built-in                       |
| :-------------------------------------------- | :------------------------------------ |
| `maintainability/consistent-function-scoping` | `unicorn/consistent-function-scoping` |
| `maintainability/error-message`               | `unicorn/error-message`               |
| `maintainability/no-lonely-if`                | `eslint/no-lonely-if`                 |
| `maintainability/no-nested-ternary`           | `eslint/no-nested-ternary`            |
| `maintainability/no-unreadable-iife`          | `unicorn/no-unreadable-iife`          |

What this package adds to oxlint is the other 7: every rule in the table below that is not listed here.

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
npm install oxlint-plugin-maintainability --save-dev
```

### Vite+

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: ['oxlint-plugin-maintainability'],
    rules: {
      'maintainability/cognitive-complexity': 'error',
    },
  },
});
```

### oxlint

```json
{
  "jsPlugins": ["oxlint-plugin-maintainability"],
  "rules": {
    "maintainability/cognitive-complexity": "error"
  }
}
```

That enables one rule as an example; add the ones you want from the table below.

### ESLint

Install [`eslint-plugin-maintainability`](https://www.npmjs.com/package/eslint-plugin-maintainability) instead. It has the same rules, plus presets for ESLint's flat config.

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

| Rule                                                                                                                                                                                                                 |   CWE    | OWASP | CVSS | Description                                                                                          | 🧠  | 💼  | ⚠️  | 🔧  | 💡  | 🚫  |
| :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------: | :---: | :--: | :--------------------------------------------------------------------------------------------------- | :-: | :-: | :-: | :-: | :-: | :-: |
| [cognitive-complexity](https://eslint.interlace.tools/docs/quality/plugin-maintainability/rules/cognitive-complexity?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-maintainability)               |          |       |      | Enforces a maximum cognitive complexity threshold with refactoring guidance                          | 🟢  |     | ⚠️  |     | 💡  |     |
| [consistent-function-scoping](https://eslint.interlace.tools/docs/quality/plugin-maintainability/rules/consistent-function-scoping?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-maintainability) |          |       |      | Move functions to the highest possible scope                                                         | 🟢  |     |     |     | 💡  |     |
| [error-message](https://eslint.interlace.tools/docs/quality/plugin-maintainability/rules/error-message?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-maintainability)                             |          |       |      | Enforce providing a message when creating built-in Error objects for better debugging                | 🟢  |     |     |     | 💡  |     |
| [identical-functions](https://eslint.interlace.tools/docs/quality/plugin-maintainability/rules/identical-functions?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-maintainability)                 | CWE-1104 |       |      | Detects duplicate function implementations with DRY refactoring suggestions                          | 🟢  |     | ⚠️  |     | 💡  |     |
| [max-parameters](https://eslint.interlace.tools/docs/quality/plugin-maintainability/rules/max-parameters?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-maintainability)                           |          |       |      | ESLint Rule: max-parameters with LLM-optimized suggestions and auto-fix capabilities.                | 🟢  |     | ⚠️  |     | 💡  |     |
| [nested-complexity-hotspots](https://eslint.interlace.tools/docs/quality/plugin-maintainability/rules/nested-complexity-hotspots?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-maintainability)   |          |       |      | ESLint Rule: nested-complexity-hotspots with LLM-optimized suggestions and auto-fix capabilities.    | 🟢  |     |     |     | 💡  |     |
| [no-lonely-if](https://eslint.interlace.tools/docs/quality/plugin-maintainability/rules/no-lonely-if?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-maintainability)                               |          |       |      | Disallow if statements as the only statement in else blocks                                          | 🟢  |     |     |     | 💡  |     |
| [no-missing-error-context](https://eslint.interlace.tools/docs/quality/plugin-maintainability/rules/no-missing-error-context?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-maintainability)       |          |       |      | ESLint Rule: no-missing-error-context with LLM-optimized suggestions and auto-fix capabilities.      | 🟢  |     |     |     | 💡  |     |
| [no-nested-ternary](https://eslint.interlace.tools/docs/quality/plugin-maintainability/rules/no-nested-ternary?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-maintainability)                     |          |       |      | Prevent nested ternary expressions for better readability                                            | 🟢  |     |     |     | 💡  |     |
| [no-silent-errors](https://eslint.interlace.tools/docs/quality/plugin-maintainability/rules/no-silent-errors?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-maintainability)                       |          |       |      | ESLint Rule: no-silent-errors with LLM-optimized suggestions and auto-fix capabilities.              | 🟢  |     |     |     | 💡  |     |
| [no-unhandled-promise](https://eslint.interlace.tools/docs/quality/plugin-maintainability/rules/no-unhandled-promise?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-maintainability)               | CWE-1024 |       |      | Disallow unhandled Promise rejections with LLM-optimized suggestions for proper async error handling | 🟢  |     |     |     | 💡  |     |
| [no-unreadable-iife](https://eslint.interlace.tools/docs/quality/plugin-maintainability/rules/no-unreadable-iife?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-maintainability)                   |          |       |      | Disallow unreadable IIFE (Immediately Invoked Function Expression) patterns                          | 🟢  |     |     |     | 💡  |     |

## ⭐ Support & follow

If this plugin caught a real bug for you, **[star the repo](https://github.com/ofri-peretz/eslint)** — stars are the signal that keeps the Interlace ESLint ecosystem maintained — and **[follow the writeups on Dev.to](https://dev.to/ofri-peretz)** for the benchmarks and security research behind these rules.

[![GitHub stars](https://img.shields.io/github/stars/ofri-peretz/eslint?style=social)](https://github.com/ofri-peretz/eslint)

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/quality/plugin-maintainability?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-maintainability"><img src="https://eslint.interlace.tools/images/og-maintainability.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>

<p align="center">
  <a href="https://eslint.interlace.tools/docs/quality/plugin-maintainability?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-maintainability" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="70" /></picture></a>
</p>
