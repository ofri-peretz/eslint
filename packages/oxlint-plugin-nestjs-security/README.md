<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-nestjs-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-nestjs-security" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="90" /></picture></a>
  &nbsp;&nbsp;
  <a href="https://nestjs.com" target="_blank"><img src="https://eslint.interlace.tools/logos/nestjs.svg" alt="NestJS" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://oxc.rs" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/oxlint-dark.svg"><img src="https://eslint.interlace.tools/logos/oxlint-light.svg" alt="oxlint" height="90" /></picture></a>
</p>

<p align="center">
  Security rules tailored for NestJS applications (Controllers, Providers, Decorators).
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/oxlint-plugin-nestjs-security" target="_blank"><img src="https://img.shields.io/npm/v/oxlint-plugin-nestjs-security.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/oxlint-plugin-nestjs-security" target="_blank"><img src="https://img.shields.io/npm/dm/oxlint-plugin-nestjs-security.svg" alt="NPM Downloads" /></a>
  <a href="https://packagephobia.com/result?p=oxlint-plugin-nestjs-security" target="_blank"><img src="https://badgen.net/packagephobia/install/oxlint-plugin-nestjs-security" alt="Install Size" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=eslint-plugin-nestjs-security" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=eslint-plugin-nestjs-security" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/ofri-peretz/eslint" target="_blank"><img src="https://api.securityscorecards.dev/projects/github.com/ofri-peretz/eslint/badge" alt="OpenSSF Scorecard" /></a>
</p>

> ⭐ If this plugin caught a real bug for you, [**star the repo**](https://github.com/ofri-peretz/eslint) — it's the signal that keeps these rules maintained.

## Description

`oxlint-plugin-nestjs-security` is the [oxlint](https://oxc.rs/docs/guide/usage/linter/js-plugins) and [Vite+](https://viteplus.dev/guide/lint) name for [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security). It carries the same rules under the same IDs (`nestjs-security/<rule>`), always at the same version, because it re-exports that package rather than copying it. Installing it does not install ESLint.

## Covered natively by oxlint

None of these 10 rules has an oxlint built-in equivalent. Every rule here is new to oxlint.

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
npm install oxlint-plugin-nestjs-security --save-dev
```

### Vite+

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: ['oxlint-plugin-nestjs-security'],
    rules: {
      'nestjs-security/no-hybrid-app-config-loss': 'error',
      'nestjs-security/no-permissive-cors': 'error',
      'nestjs-security/no-unsafe-multer-filename': 'error',
      'nestjs-security/require-guards': 'error',
      'nestjs-security/require-validation-pipe-whitelist': 'error',
    },
  },
});
```

### oxlint

```json
{
  "jsPlugins": ["oxlint-plugin-nestjs-security"],
  "rules": {
    "nestjs-security/no-hybrid-app-config-loss": "error",
    "nestjs-security/no-permissive-cors": "error",
    "nestjs-security/no-unsafe-multer-filename": "error",
    "nestjs-security/require-guards": "error",
    "nestjs-security/require-validation-pipe-whitelist": "error"
  }
}
```

These are the rules the plugin recommends (💼 in the table below).

### ESLint

Install [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security) instead. It has the same rules, plus presets for ESLint's flat config.

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

| Rule                                                                                                                                                                                                                              |   CWE   |  OWASP   | CVSS | Description                                                                                                  | 🧠  | 💼  | ⚠️  | 🔧  | 💡  | 🚫  |
| :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-----: | :------: | :--: | :----------------------------------------------------------------------------------------------------------- | :-: | :-: | :-: | :-: | :-: | :-: |
| [no-exposed-private-fields](https://eslint.interlace.tools/docs/security/plugin-nestjs-security/rules/no-exposed-private-fields?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-nestjs-security)                 | CWE-200 | A01:2021 |      | This rule detects sensitive fields (like passwords, tokens, secrets) in entity or DTO classes that are not…  | 🟢  |     | ⚠️  |     |     |     |
| [no-hybrid-app-config-loss](https://eslint.interlace.tools/docs/security/plugin-nestjs-security/rules/no-hybrid-app-config-loss?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-nestjs-security)                 | CWE-20  | A03:2021 |      | Detect connectMicroservice() without inheritAppConfig, which silently drops every global pipe and guard fro… | 🟢  | 💼  |     |     |     |     |
| [no-missing-validation-pipe](https://eslint.interlace.tools/docs/security/plugin-nestjs-security/rules/no-missing-validation-pipe?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-nestjs-security)               | CWE-20  | A03:2021 |      | The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance:    | 🟡  |     | ⚠️  |     |     |     |
| [no-permissive-cors](https://eslint.interlace.tools/docs/security/plugin-nestjs-security/rules/no-permissive-cors?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-nestjs-security)                               | CWE-942 | A05:2021 |      | Flags CORS configured to accept any origin — a bare enableCors(), origin '*', or the reflecting origin true. | 🟢  | 💼  |     |     |     |     |
| [no-res-bypass-serialization](https://eslint.interlace.tools/docs/security/plugin-nestjs-security/rules/no-res-bypass-serialization?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-nestjs-security)             | CWE-200 | A01:2021 |      | This rule detects route handlers that inject @Res() without passthrough and then write an object, which sil… | 🟢  |     | ⚠️  |     |     |     |
| [no-unguarded-swagger](https://eslint.interlace.tools/docs/security/plugin-nestjs-security/rules/no-unguarded-swagger?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-nestjs-security)                           | CWE-200 | A01:2021 |      | This rule detects SwaggerModule.setup() running unconditionally in an application bootstrap, which publishe… | 🟢  |     | ⚠️  |     |     |     |
| [no-unsafe-multer-filename](https://eslint.interlace.tools/docs/security/plugin-nestjs-security/rules/no-unsafe-multer-filename?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-nestjs-security)                 | CWE-22  | A01:2021 |      | Flags a multer diskStorage filename callback that stores an upload under the name the client chose.          | 🟢  | 💼  |     |     |     |     |
| [require-guards](https://eslint.interlace.tools/docs/security/plugin-nestjs-security/rules/require-guards?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-nestjs-security)                                       | CWE-306 | A01:2021 |      | The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance:    | 🟢  | 💼  |     |     |     |     |
| [require-throttler](https://eslint.interlace.tools/docs/security/plugin-nestjs-security/rules/require-throttler?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-nestjs-security)                                 | CWE-770 | A05:2021 |      | This rule detects NestJS controllers and route handlers that lack rate limiting, which can make the applica… | 🟢  |     | ⚠️  |     |     |     |
| [require-validation-pipe-whitelist](https://eslint.interlace.tools/docs/security/plugin-nestjs-security/rules/require-validation-pipe-whitelist?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-nestjs-security) | CWE-915 | A03:2021 |      | Requires whitelist true on ValidationPipe, so properties the DTO never declared are stripped instead of rea… | 🟢  | 💼  |     |     |     |     |

## ⭐ Support & follow

If this plugin caught a real bug for you, **[star the repo](https://github.com/ofri-peretz/eslint)** — stars are the signal that keeps the Interlace ESLint ecosystem maintained — and **[follow the writeups on Dev.to](https://dev.to/ofri-peretz)** for the benchmarks and security research behind these rules.

[![GitHub stars](https://img.shields.io/github/stars/ofri-peretz/eslint?style=social)](https://github.com/ofri-peretz/eslint)

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-nestjs-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-nestjs-security"><img src="https://eslint.interlace.tools/images/og-nestjs-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-nestjs-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-nestjs-security" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="70" /></picture></a>
</p>
