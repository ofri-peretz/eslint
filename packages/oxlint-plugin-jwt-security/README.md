<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-jwt-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-jwt-security" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="90" /></picture></a>
  &nbsp;&nbsp;
  <a href="https://jwt.io" target="_blank"><img src="https://eslint.interlace.tools/logos/jwt.svg" alt="JSON Web Tokens" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://oxc.rs" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/oxlint-dark.svg"><img src="https://eslint.interlace.tools/logos/oxlint-light.svg" alt="oxlint" height="90" /></picture></a>
</p>

<p align="center">
  Security validation for JSON Web Tokens (JWT) implementation (signing, verification).
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/oxlint-plugin-jwt-security" target="_blank"><img src="https://img.shields.io/npm/v/oxlint-plugin-jwt-security.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/oxlint-plugin-jwt-security" target="_blank"><img src="https://img.shields.io/npm/dm/oxlint-plugin-jwt-security.svg" alt="NPM Downloads" /></a>
  <a href="https://packagephobia.com/result?p=oxlint-plugin-jwt-security" target="_blank"><img src="https://badgen.net/packagephobia/install/oxlint-plugin-jwt-security" alt="Install Size" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=eslint-plugin-jwt-security" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=eslint-plugin-jwt-security" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/ofri-peretz/eslint" target="_blank"><img src="https://api.securityscorecards.dev/projects/github.com/ofri-peretz/eslint/badge" alt="OpenSSF Scorecard" /></a>
</p>

> ⭐ If this plugin caught a real bug for you, [**star the repo**](https://github.com/ofri-peretz/eslint) — it's the signal that keeps these rules maintained.

## Description

`oxlint-plugin-jwt-security` is the [oxlint](https://oxc.rs/docs/guide/usage/linter/js-plugins) and [Vite+](https://viteplus.dev/guide/lint) name for [`eslint-plugin-jwt-security`](https://www.npmjs.com/package/eslint-plugin-jwt-security). It carries the same rules under the same IDs (`jwt-security/<rule>`), always at the same version, because it re-exports that package rather than copying it. Installing it does not install ESLint.

## Covered natively by oxlint

None of these 13 rules has an oxlint built-in equivalent. Every rule here is new to oxlint.

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
npm install oxlint-plugin-jwt-security --save-dev
```

### Vite+

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: ['oxlint-plugin-jwt-security'],
    rules: {
      'jwt-security/no-algorithm-confusion': 'error',
      'jwt-security/no-algorithm-none': 'error',
      'jwt-security/no-decode-without-verify': 'error',
      'jwt-security/no-hardcoded-secret': 'error',
      'jwt-security/no-timestamp-manipulation': 'error',
      'jwt-security/no-weak-secret': 'error',
      'jwt-security/require-algorithm-whitelist': 'error',
      'jwt-security/require-expiration': 'error',
    },
  },
});
```

### oxlint

```json
{
  "jsPlugins": ["oxlint-plugin-jwt-security"],
  "rules": {
    "jwt-security/no-algorithm-confusion": "error",
    "jwt-security/no-algorithm-none": "error",
    "jwt-security/no-decode-without-verify": "error",
    "jwt-security/no-hardcoded-secret": "error",
    "jwt-security/no-timestamp-manipulation": "error",
    "jwt-security/no-weak-secret": "error",
    "jwt-security/require-algorithm-whitelist": "error",
    "jwt-security/require-expiration": "error"
  }
}
```

These are the rules the plugin recommends (💼 in the table below).

### ESLint

Install [`eslint-plugin-jwt-security`](https://www.npmjs.com/package/eslint-plugin-jwt-security) instead. It has the same rules, plus presets for ESLint's flat config.

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

| Rule                                                                                                                                                                                                            |   CWE   | OWASP | CVSS | Description                                                                                                  | 🧠  | 💼  | ⚠️  | 🔧  | 💡  | 🚫  |
| :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-----: | :---: | :--: | :----------------------------------------------------------------------------------------------------------- | :-: | :-: | :-: | :-: | :-: | :-: |
| [no-algorithm-confusion](https://eslint.interlace.tools/docs/security/plugin-jwt-security/rules/no-algorithm-confusion?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-jwt-security)           | CWE-347 |       |      | This rule detects algorithm confusion attacks where symmetric algorithms (HS256, HS384, HS512) are used wit… | 🟢  | 💼  |     |     |     |     |
| [no-algorithm-none](https://eslint.interlace.tools/docs/security/plugin-jwt-security/rules/no-algorithm-none?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-jwt-security)                     | CWE-347 |       |      | This rule detects attempts to use the none algorithm which completely bypasses JWT signature verification    | 🟢  | 💼  |     |     |     |     |
| [no-decode-without-verify](https://eslint.interlace.tools/docs/security/plugin-jwt-security/rules/no-decode-without-verify?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-jwt-security)       | CWE-345 |       |      | The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance:    | 🟢  | 💼  |     |     |     |     |
| [no-hardcoded-secret](https://eslint.interlace.tools/docs/security/plugin-jwt-security/rules/no-hardcoded-secret?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-jwt-security)                 | CWE-798 |       |      | The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance:    | 🟢  | 💼  |     |     |     |     |
| [no-sensitive-payload](https://eslint.interlace.tools/docs/security/plugin-jwt-security/rules/no-sensitive-payload?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-jwt-security)               | CWE-359 |       |      | JWT payloads are NOT encrypted, only base64-encoded                                                          | 🟢  |     | ⚠️  |     |     |     |
| [no-timestamp-manipulation](https://eslint.interlace.tools/docs/security/plugin-jwt-security/rules/no-timestamp-manipulation?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-jwt-security)     | CWE-294 |       |      | This rule detects noTimestamp: true which disables automatic iat (issued at) claim generation                | 🟢  | 💼  |     |     |     |     |
| [no-weak-secret](https://eslint.interlace.tools/docs/security/plugin-jwt-security/rules/no-weak-secret?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-jwt-security)                           | CWE-326 |       |      | The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance:    | 🟢  | 💼  |     |     |     |     |
| [require-algorithm-whitelist](https://eslint.interlace.tools/docs/security/plugin-jwt-security/rules/require-algorithm-whitelist?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-jwt-security) | CWE-757 |       |      | This rule enforces explicit algorithm specification in verify() calls                                        | 🟢  | 💼  |     |     |     |     |
| [require-audience-validation](https://eslint.interlace.tools/docs/security/plugin-jwt-security/rules/require-audience-validation?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-jwt-security) | CWE-287 |       |      | The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance:    | 🟢  |     |     |     |     |     |
| [require-expiration](https://eslint.interlace.tools/docs/security/plugin-jwt-security/rules/require-expiration?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-jwt-security)                   | CWE-613 |       |      | The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance:    | 🟢  | 💼  |     |     |     |     |
| [require-issued-at](https://eslint.interlace.tools/docs/security/plugin-jwt-security/rules/require-issued-at?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-jwt-security)                     | CWE-294 |       |      | This rule ensures tokens have the iat claim for freshness validation                                         | 🟢  |     | ⚠️  |     |     |     |
| [require-issuer-validation](https://eslint.interlace.tools/docs/security/plugin-jwt-security/rules/require-issuer-validation?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-jwt-security)     | CWE-287 |       |      | The rule provides LLM-optimized error messages (Compact 2-line format) with actionable security guidance:    | 🟢  |     |     |     |     |     |
| [require-max-age](https://eslint.interlace.tools/docs/security/plugin-jwt-security/rules/require-max-age?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-jwt-security)                         | CWE-294 |       |      | This rule mandates maxAge in verify operations                                                               | 🟢  |     |     |     |     |     |

## ⭐ Support & follow

If this plugin caught a real bug for you, **[star the repo](https://github.com/ofri-peretz/eslint)** — stars are the signal that keeps the Interlace ESLint ecosystem maintained — and **[follow the writeups on Dev.to](https://dev.to/ofri-peretz)** for the benchmarks and security research behind these rules.

[![GitHub stars](https://img.shields.io/github/stars/ofri-peretz/eslint?style=social)](https://github.com/ofri-peretz/eslint)

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-jwt-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-jwt-security"><img src="https://eslint.interlace.tools/images/og-jwt-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-jwt-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-jwt-security" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="70" /></picture></a>
</p>
