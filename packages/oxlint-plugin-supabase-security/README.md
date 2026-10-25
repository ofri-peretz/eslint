<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-supabase-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-supabase-security" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="90" /></picture></a>
  &nbsp;&nbsp;
  <a href="https://oxc.rs" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/oxlint-dark.svg"><img src="https://eslint.interlace.tools/logos/oxlint-light.svg" alt="oxlint" height="90" /></picture></a>
</p>

<p align="center">
  Security rules for <a href="https://www.npmjs.com/package/@supabase/supabase-js">@supabase/supabase-js</a> — the Supabase client.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/oxlint-plugin-supabase-security" target="_blank"><img src="https://img.shields.io/npm/v/oxlint-plugin-supabase-security.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/oxlint-plugin-supabase-security" target="_blank"><img src="https://img.shields.io/npm/dm/oxlint-plugin-supabase-security.svg" alt="NPM Downloads" /></a>
  <a href="https://packagephobia.com/result?p=oxlint-plugin-supabase-security" target="_blank"><img src="https://badgen.net/packagephobia/install/oxlint-plugin-supabase-security" alt="Install Size" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/ofri-peretz/eslint" target="_blank"><img src="https://api.securityscorecards.dev/projects/github.com/ofri-peretz/eslint/badge" alt="OpenSSF Scorecard" /></a>
</p>

> ⭐ If this plugin caught a real bug for you, [**star the repo**](https://github.com/ofri-peretz/eslint) — it's the signal that keeps these rules maintained.

## Description

`oxlint-plugin-supabase-security` is the [oxlint](https://oxc.rs/docs/guide/usage/linter/js-plugins) and [Vite+](https://viteplus.dev/guide/lint) name for [`eslint-plugin-supabase-security`](https://www.npmjs.com/package/eslint-plugin-supabase-security). It carries the same rules under the same IDs (`supabase-security/<rule>`), always at the same version, because it re-exports that package rather than copying it. Installing it does not install ESLint.

## Covered natively by oxlint

None of these 4 rules has an oxlint built-in equivalent. Every rule here is new to oxlint.

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
npm install oxlint-plugin-supabase-security --save-dev
```

### Vite+

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: ['oxlint-plugin-supabase-security'],
    rules: {
      'supabase-security/no-dynamic-rpc-name': 'error',
    },
  },
});
```

### oxlint

```json
{
  "jsPlugins": ["oxlint-plugin-supabase-security"],
  "rules": {
    "supabase-security/no-dynamic-rpc-name": "error"
  }
}
```

That enables one rule as an example; add the ones you want from the table below.

### ESLint

Install [`eslint-plugin-supabase-security`](https://www.npmjs.com/package/eslint-plugin-supabase-security) instead. It has the same rules, plus presets for ESLint's flat config.

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

| Rule                                                                                                                                                                                                                          |   CWE   |  OWASP   | CVSS | Description                                           | 🧠  | 💼  | ⚠️  | 🔧  | 💡  | 🚫  |
| :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-----: | :------: | :--: | :---------------------------------------------------- | :-: | :-: | :-: | :-: | :-: | :-: |
| [no-dynamic-rpc-name](https://eslint.interlace.tools/docs/security/plugin-supabase-security/rules/no-dynamic-rpc-name?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-supabase-security)                     | CWE-913 | A03:2021 |      | Call `.rpc()` with a literal function name            | 🟢  |     |     |     |     |     |
| [no-public-storage-bucket](https://eslint.interlace.tools/docs/security/plugin-supabase-security/rules/no-public-storage-bucket?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-supabase-security)           | CWE-732 | A01:2021 |      | Do not create a Supabase storage bucket as public     | 🟢  |     |     |     |     |     |
| [no-service-role-key-in-client](https://eslint.interlace.tools/docs/security/plugin-supabase-security/rules/no-service-role-key-in-client?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-supabase-security) | CWE-798 | A02:2021 |      | Keep the Supabase service_role key out of client code | 🟢  |     |     |     |     |     |
| [require-auth-error-check](https://eslint.interlace.tools/docs/security/plugin-supabase-security/rules/require-auth-error-check?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-supabase-security)           | CWE-287 | A07:2021 |      | Read `error` from a Supabase auth result              | 🟢  |     |     |     |     |     |

## ⭐ Support & follow

If this plugin caught a real bug for you, **[star the repo](https://github.com/ofri-peretz/eslint)** — stars are the signal that keeps the Interlace ESLint ecosystem maintained — and **[follow the writeups on Dev.to](https://dev.to/ofri-peretz)** for the benchmarks and security research behind these rules.

[![GitHub stars](https://img.shields.io/github/stars/ofri-peretz/eslint?style=social)](https://github.com/ofri-peretz/eslint)

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-supabase-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-supabase-security"><img src="https://eslint.interlace.tools/images/og-supabase-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-supabase-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-supabase-security" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="70" /></picture></a>
</p>
