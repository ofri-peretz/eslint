<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-anthropic-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-anthropic-security" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="90" /></picture></a>
  &nbsp;&nbsp;
  <a href="https://docs.anthropic.com" target="_blank"><img src="https://eslint.interlace.tools/logos/claude.svg" alt="Anthropic Claude SDK" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://oxc.rs" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/oxlint-dark.svg"><img src="https://eslint.interlace.tools/logos/oxlint-light.svg" alt="oxlint" height="90" /></picture></a>
</p>

<p align="center">
  Security rules for the Anthropic SDK and Claude Agent SDK.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/oxlint-plugin-anthropic-security" target="_blank"><img src="https://img.shields.io/npm/v/oxlint-plugin-anthropic-security.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/oxlint-plugin-anthropic-security" target="_blank"><img src="https://img.shields.io/npm/dm/oxlint-plugin-anthropic-security.svg" alt="NPM Downloads" /></a>
  <a href="https://packagephobia.com/result?p=oxlint-plugin-anthropic-security" target="_blank"><img src="https://badgen.net/packagephobia/install/oxlint-plugin-anthropic-security" alt="Install Size" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/ofri-peretz/eslint" target="_blank"><img src="https://api.securityscorecards.dev/projects/github.com/ofri-peretz/eslint/badge" alt="OpenSSF Scorecard" /></a>
</p>

> ⭐ If this plugin caught a real bug for you, [**star the repo**](https://github.com/ofri-peretz/eslint) — it's the signal that keeps these rules maintained.

## Description

`oxlint-plugin-anthropic-security` is the [oxlint](https://oxc.rs/docs/guide/usage/linter/js-plugins) and [Vite+](https://viteplus.dev/guide/lint) name for [`eslint-plugin-anthropic-security`](https://www.npmjs.com/package/eslint-plugin-anthropic-security). It carries the same rules under the same IDs (`anthropic-security/<rule>`), always at the same version, because it re-exports that package rather than copying it. Installing it does not install ESLint.

## Covered natively by oxlint

None of these 3 rules has an oxlint built-in equivalent. Every rule here is new to oxlint.

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
npm install oxlint-plugin-anthropic-security --save-dev
```

### Vite+

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: ['oxlint-plugin-anthropic-security'],
    rules: {
      'anthropic-security/no-browser-api-key-exposure': 'error',
    },
  },
});
```

### oxlint

```json
{
  "jsPlugins": ["oxlint-plugin-anthropic-security"],
  "rules": {
    "anthropic-security/no-browser-api-key-exposure": "error"
  }
}
```

That enables one rule as an example; add the ones you want from the table below.

### ESLint

Install [`eslint-plugin-anthropic-security`](https://www.npmjs.com/package/eslint-plugin-anthropic-security) instead. It has the same rules, plus presets for ESLint's flat config.

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

| Rule                                                                                                                                                                                                                              |   CWE    |  OWASP   | CVSS | Description                                                                       | 🧠  | 💼  | ⚠️  | 🔧  | 💡  | 🚫  |
| :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------: | :------: | :--: | :-------------------------------------------------------------------------------- | :-: | :-: | :-: | :-: | :-: | :-: |
| [no-browser-api-key-exposure](https://eslint.interlace.tools/docs/security/plugin-anthropic-security/rules/no-browser-api-key-exposure?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-anthropic-security)       | CWE-522  | A07:2021 |      | Forbid dangerouslyAllowBrowser, which exposes the Anthropic API key to the client | 🟢  |     |     |     |     |     |
| [no-hardcoded-api-key](https://eslint.interlace.tools/docs/security/plugin-anthropic-security/rules/no-hardcoded-api-key?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-anthropic-security)                     | CWE-798  | A07:2021 |      | Forbid a literal API key in the Anthropic client options                          | 🟢  |     |     |     |     |     |
| [no-untrusted-content-in-prompt](https://eslint.interlace.tools/docs/security/plugin-anthropic-security/rules/no-untrusted-content-in-prompt?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-anthropic-security) | CWE-1427 | A03:2021 |      | Disallow untrusted content built into the Anthropic system prompt                 | 🟢  |     |     |     |     |     |

## ⭐ Support & follow

If this plugin caught a real bug for you, **[star the repo](https://github.com/ofri-peretz/eslint)** — stars are the signal that keeps the Interlace ESLint ecosystem maintained — and **[follow the writeups on Dev.to](https://dev.to/ofri-peretz)** for the benchmarks and security research behind these rules.

[![GitHub stars](https://img.shields.io/github/stars/ofri-peretz/eslint?style=social)](https://github.com/ofri-peretz/eslint)

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-anthropic-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-anthropic-security"><img src="https://eslint.interlace.tools/images/og-anthropic-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-anthropic-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-anthropic-security" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="70" /></picture></a>
</p>
