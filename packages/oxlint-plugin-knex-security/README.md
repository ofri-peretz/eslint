<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-knex-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-knex-security" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="90" /></picture></a>
  &nbsp;&nbsp;
  <a href="https://knexjs.org" target="_blank"><img src="https://eslint.interlace.tools/logos/knex.svg" alt="Knex.js" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://oxc.rs" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/oxlint-dark.svg"><img src="https://eslint.interlace.tools/logos/oxlint-light.svg" alt="oxlint" height="90" /></picture></a>
</p>

<p align="center">
  Security rules for knex (SQL injection prevention in raw queries).
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/oxlint-plugin-knex-security" target="_blank"><img src="https://img.shields.io/npm/v/oxlint-plugin-knex-security.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/oxlint-plugin-knex-security" target="_blank"><img src="https://img.shields.io/npm/dm/oxlint-plugin-knex-security.svg" alt="NPM Downloads" /></a>
  <a href="https://packagephobia.com/result?p=oxlint-plugin-knex-security" target="_blank"><img src="https://badgen.net/packagephobia/install/oxlint-plugin-knex-security" alt="Install Size" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=eslint-plugin-knex-security" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=eslint-plugin-knex-security" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/ofri-peretz/eslint" target="_blank"><img src="https://api.securityscorecards.dev/projects/github.com/ofri-peretz/eslint/badge" alt="OpenSSF Scorecard" /></a>
</p>

> ⭐ If this plugin caught a real bug for you, [**star the repo**](https://github.com/ofri-peretz/eslint) — it's the signal that keeps these rules maintained.

## Description

`oxlint-plugin-knex-security` is the [oxlint](https://oxc.rs/docs/guide/usage/linter/js-plugins) and [Vite+](https://viteplus.dev/guide/lint) name for [`eslint-plugin-knex-security`](https://www.npmjs.com/package/eslint-plugin-knex-security). It carries the same rules under the same IDs (`knex-security/<rule>`), always at the same version, because it re-exports that package rather than copying it. Installing it does not install ESLint.

## Why Knex-specific?

Being Knex-specific is what makes the rule precise. It knows which calls are raw-SQL sinks (`.raw()`) and which idioms are already safe, so it reports the patterns that actually lead to injection and stays quiet on parameterized queries. It also tracks variable taint across statements, so a query built on one line and executed on another is still reported.

The detection itself is shared with the other Interlace driver plugins through `createSqlInjectionRule` — install the one matching your stack and you get exactly one finding per line.

## Covered natively by oxlint

None of these 5 rules has an oxlint built-in equivalent. Every rule here is new to oxlint.

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
npm install oxlint-plugin-knex-security --save-dev
```

### Vite+

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: ['oxlint-plugin-knex-security'],
    rules: {
      'knex-security/no-unsafe-query': 'error',
    },
  },
});
```

### oxlint

```json
{
  "jsPlugins": ["oxlint-plugin-knex-security"],
  "rules": {
    "knex-security/no-unsafe-query": "error"
  }
}
```

These are the rules the plugin recommends (💼 in the table below).

### ESLint

Install [`eslint-plugin-knex-security`](https://www.npmjs.com/package/eslint-plugin-knex-security) instead. It has the same rules, plus presets for ESLint's flat config.

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

| Rule                                                                                                                                                                                                        |   CWE   |  OWASP   | CVSS | Description                                                                                                  | 🧠  | 💼  | ⚠️  | 🔧  | 💡  | 🚫  |
| :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-----: | :------: | :--: | :----------------------------------------------------------------------------------------------------------- | :-: | :-: | :-: | :-: | :-: | :-: |
| [no-hardcoded-credentials](https://eslint.interlace.tools/docs/security/plugin-knex-security/rules/no-hardcoded-credentials?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-knex-security) | CWE-798 | A07:2021 |      | Disallow literal database passwords in knex connection configuration, including credentials embedded in a c… | 🟢  |     |     |     |     |     |
| [no-mass-assignment](https://eslint.interlace.tools/docs/security/plugin-knex-security/rules/no-mass-assignment?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-knex-security)             | CWE-915 | A04:2021 |      | Disallow writing an inbound request object straight to the database through knex, which lets the caller set… | 🟢  |     |     |     |     |     |
| [no-unsafe-query](https://eslint.interlace.tools/docs/security/plugin-knex-security/rules/no-unsafe-query?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-knex-security)                   | CWE-89  | A03:2021 |      | Prevent SQL injection by disallowing string concatenation or interpolated template literals in knex.raw() c… | 🟢  | 💼  |     |     |     |     |
| [no-unscoped-mutation](https://eslint.interlace.tools/docs/security/plugin-knex-security/rules/no-unscoped-mutation?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-knex-security)         | CWE-284 | A01:2021 |      | Require a chained `.where()` on Knex delete and update builders, so a bulk mutation cannot rewrite or delet… | 🟢  |     |     |     |     |     |
| [require-tls](https://eslint.interlace.tools/docs/security/plugin-knex-security/rules/require-tls?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-knex-security)                           | CWE-319 | A02:2021 |      | Require TLS on Knex database connections, so queries and credentials are not sent in cleartext and the serv… | 🟢  |     |     |     |     |     |

## ⭐ Support & follow

If this plugin caught a real bug for you, **[star the repo](https://github.com/ofri-peretz/eslint)** — stars are the signal that keeps the Interlace ESLint ecosystem maintained — and **[follow the writeups on Dev.to](https://dev.to/ofri-peretz)** for the benchmarks and security research behind these rules.

[![GitHub stars](https://img.shields.io/github/stars/ofri-peretz/eslint?style=social)](https://github.com/ofri-peretz/eslint)

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-knex-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-knex-security"><img src="https://eslint.interlace.tools/images/og-knex-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-knex-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-knex-security" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="70" /></picture></a>
</p>
