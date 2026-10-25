<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-mongodb-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-mongodb-security" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="90" /></picture></a>
  &nbsp;&nbsp;
  <a href="https://www.mongodb.com" target="_blank"><img src="https://eslint.interlace.tools/logos/mongodb.svg" alt="MongoDB" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://oxc.rs" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/oxlint-dark.svg"><img src="https://eslint.interlace.tools/logos/oxlint-light.svg" alt="oxlint" height="90" /></picture></a>
</p>

<p align="center">
  Security rules for MongoDB queries and interactions (NoSQL injection).
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/oxlint-plugin-mongodb-security" target="_blank"><img src="https://img.shields.io/npm/v/oxlint-plugin-mongodb-security.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/oxlint-plugin-mongodb-security" target="_blank"><img src="https://img.shields.io/npm/dm/oxlint-plugin-mongodb-security.svg" alt="NPM Downloads" /></a>
  <a href="https://packagephobia.com/result?p=oxlint-plugin-mongodb-security" target="_blank"><img src="https://badgen.net/packagephobia/install/oxlint-plugin-mongodb-security" alt="Install Size" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=eslint-plugin-mongodb-security" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=eslint-plugin-mongodb-security" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/ofri-peretz/eslint" target="_blank"><img src="https://api.securityscorecards.dev/projects/github.com/ofri-peretz/eslint/badge" alt="OpenSSF Scorecard" /></a>
</p>

> ⭐ If this plugin caught a real bug for you, [**star the repo**](https://github.com/ofri-peretz/eslint) — it's the signal that keeps these rules maintained.

## Description

`oxlint-plugin-mongodb-security` is the [oxlint](https://oxc.rs/docs/guide/usage/linter/js-plugins) and [Vite+](https://viteplus.dev/guide/lint) name for [`eslint-plugin-mongodb-security`](https://www.npmjs.com/package/eslint-plugin-mongodb-security). It carries the same rules under the same IDs (`mongodb-security/<rule>`), always at the same version, because it re-exports that package rather than copying it. Installing it does not install ESLint.

## Covered natively by oxlint

None of these 16 rules has an oxlint built-in equivalent. Every rule here is new to oxlint.

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
npm install oxlint-plugin-mongodb-security --save-dev
```

### Vite+

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: ['oxlint-plugin-mongodb-security'],
    rules: {
      'mongodb-security/no-debug-mode-production': 'error',
      'mongodb-security/no-hardcoded-connection-string': 'error',
      'mongodb-security/no-hardcoded-credentials': 'error',
      'mongodb-security/no-operator-injection': 'error',
      'mongodb-security/no-unsafe-populate': 'error',
      'mongodb-security/no-unsafe-query': 'error',
      'mongodb-security/no-unsafe-regex-query': 'error',
      'mongodb-security/no-unsafe-where': 'error',
    },
  },
});
```

### oxlint

```json
{
  "jsPlugins": ["oxlint-plugin-mongodb-security"],
  "rules": {
    "mongodb-security/no-debug-mode-production": "error",
    "mongodb-security/no-hardcoded-connection-string": "error",
    "mongodb-security/no-hardcoded-credentials": "error",
    "mongodb-security/no-operator-injection": "error",
    "mongodb-security/no-unsafe-populate": "error",
    "mongodb-security/no-unsafe-query": "error",
    "mongodb-security/no-unsafe-regex-query": "error",
    "mongodb-security/no-unsafe-where": "error"
  }
}
```

These are the rules the plugin recommends (💼 in the table below).

### ESLint

Install [`eslint-plugin-mongodb-security`](https://www.npmjs.com/package/eslint-plugin-mongodb-security) instead. It has the same rules, plus presets for ESLint's flat config.

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

| Rule                                                                                                                                                                                                                          |   CWE   |  OWASP   | CVSS | Description                                                                                                  | 🧠  | 💼  | ⚠️  | 🔧  | 💡  | 🚫  |
| :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-----: | :------: | :--: | :----------------------------------------------------------------------------------------------------------- | :-: | :-: | :-: | :-: | :-: | :-: |
| [no-bypass-middleware](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/no-bypass-middleware?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-mongodb-security)                     | CWE-284 | A01:2021 |      | Detects Mongoose operations that bypass middleware hooks (pre/post hooks).                                   | 🟢  |     | ⚠️  |     |     |     |
| [no-debug-mode-production](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/no-debug-mode-production?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-mongodb-security)             | CWE-489 | A05:2021 |      | Detects Mongoose debug mode that could expose sensitive query information in production.                     | 🟢  | 💼  |     |     | 💡  |     |
| [no-hardcoded-connection-string](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/no-hardcoded-connection-string?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-mongodb-security) | CWE-798 | A07:2021 |      | Detects hardcoded MongoDB connection strings containing credentials in source code.                          | 🟢  | 💼  |     |     |     |     |
| [no-hardcoded-credentials](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/no-hardcoded-credentials?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-mongodb-security)             | CWE-798 | A07:2021 |      | Detects hardcoded MongoDB authentication credentials in connection options.                                  | 🟢  | 💼  |     |     |     |     |
| [no-operator-injection](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/no-operator-injection?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-mongodb-security)                   | CWE-943 | A03:2021 |      | Detects MongoDB operator injection attacks where user input is passed directly as query values, allowing at… | 🟢  | 💼  |     |     |     |     |
| [no-select-sensitive-fields](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/no-select-sensitive-fields?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-mongodb-security)         | CWE-200 | A01:2021 |      | Detects queries that may return sensitive fields like passwords, tokens, or API keys.                        | 🟢  |     | ⚠️  |     |     |     |
| [no-unbounded-find](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/no-unbounded-find?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-mongodb-security)                           | CWE-400 | A04:2021 |      | Requires limit() on find queries to prevent resource exhaustion from unbounded result sets.                  | 🟢  |     | ⚠️  |     | 💡  |     |
| [no-unsafe-populate](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/no-unsafe-populate?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-mongodb-security)                         | CWE-943 | A03:2021 |      | Detects user-controlled populate() paths that could lead to data exposure or injection.                      | 🟢  | 💼  |     |     |     |     |
| [no-unsafe-query](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/no-unsafe-query?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-mongodb-security)                               | CWE-943 | A03:2021 |      | Prevents NoSQL injection by detecting direct use of user input in MongoDB query objects.                     | 🟢  | 💼  |     |     | 💡  |     |
| [no-unsafe-regex-query](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/no-unsafe-regex-query?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-mongodb-security)                   | CWE-400 | A03:2021 |      | Detects user input in MongoDB $regex operators that could cause ReDoS (Regular Expression Denial of Service… | 🟢  | 💼  |     |     |     |     |
| [no-unsafe-where](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/no-unsafe-where?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-mongodb-security)                               | CWE-943 | A01:2021 |      | Prevents use of the dangerous $where operator which executes JavaScript on the MongoDB server, enabling Rem… | 🟢  | 💼  |     |     |     |     |
| [require-auth-mechanism](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/require-auth-mechanism?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-mongodb-security)                 | CWE-287 | A07:2021 |      | Requires explicit authentication mechanism specification for MongoDB connections.                            | 🟢  |     | ⚠️  |     |     |     |
| [require-lean-queries](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/require-lean-queries?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-mongodb-security)                     | CWE-400 | A04:2021 |      | Suggests using .lean() for read-only Mongoose queries to reduce memory usage.                                | 🟢  |     |     |     | 💡  |     |
| [require-projection](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/require-projection?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-mongodb-security)                         | CWE-200 | A01:2021 |      | Requires field projection on queries to minimize data exposure.                                              | 🟢  |     |     |     |     |     |
| [require-schema-validation](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/require-schema-validation?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-mongodb-security)           | CWE-20  | A04:2021 |      | Requires validation options on Mongoose schema fields to prevent invalid or malicious data.                  | 🟢  |     | ⚠️  |     |     |     |
| [require-tls-connection](https://eslint.interlace.tools/docs/security/plugin-mongodb-security/rules/require-tls-connection?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-mongodb-security)                 | CWE-295 | A02:2021 |      | Requires TLS/SSL encryption for MongoDB connections in production environments.                              | 🟢  |     | ⚠️  |     | 💡  |     |

## ⭐ Support & follow

If this plugin caught a real bug for you, **[star the repo](https://github.com/ofri-peretz/eslint)** — stars are the signal that keeps the Interlace ESLint ecosystem maintained — and **[follow the writeups on Dev.to](https://dev.to/ofri-peretz)** for the benchmarks and security research behind these rules.

[![GitHub stars](https://img.shields.io/github/stars/ofri-peretz/eslint?style=social)](https://github.com/ofri-peretz/eslint)

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-mongodb-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-mongodb-security"><img src="https://eslint.interlace.tools/images/og-mongodb-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-mongodb-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-mongodb-security" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="70" /></picture></a>
</p>
