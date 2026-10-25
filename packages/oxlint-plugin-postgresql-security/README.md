<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-postgresql-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-postgresql-security" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="90" /></picture></a>
  &nbsp;&nbsp;
  <a href="https://www.postgresql.org" target="_blank"><img src="https://eslint.interlace.tools/logos/postgresql.svg" alt="PostgreSQL" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://oxc.rs" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/oxlint-dark.svg"><img src="https://eslint.interlace.tools/logos/oxlint-light.svg" alt="oxlint" height="90" /></picture></a>
</p>

<p align="center">
  Security rules for PostgreSQL interaction in Node.js (SQL injection prevention).
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/oxlint-plugin-postgresql-security" target="_blank"><img src="https://img.shields.io/npm/v/oxlint-plugin-postgresql-security.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/oxlint-plugin-postgresql-security" target="_blank"><img src="https://img.shields.io/npm/dm/oxlint-plugin-postgresql-security.svg" alt="NPM Downloads" /></a>
  <a href="https://packagephobia.com/result?p=oxlint-plugin-postgresql-security" target="_blank"><img src="https://badgen.net/packagephobia/install/oxlint-plugin-postgresql-security" alt="Install Size" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=eslint-plugin-postgresql-security" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=eslint-plugin-postgresql-security" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/ofri-peretz/eslint" target="_blank"><img src="https://api.securityscorecards.dev/projects/github.com/ofri-peretz/eslint/badge" alt="OpenSSF Scorecard" /></a>
</p>

> ⭐ If this plugin caught a real bug for you, [**star the repo**](https://github.com/ofri-peretz/eslint) — it's the signal that keeps these rules maintained.

## Description

`oxlint-plugin-postgresql-security` is the [oxlint](https://oxc.rs/docs/guide/usage/linter/js-plugins) and [Vite+](https://viteplus.dev/guide/lint) name for [`eslint-plugin-postgresql-security`](https://www.npmjs.com/package/eslint-plugin-postgresql-security). It carries the same rules under the same IDs (`postgresql-security/<rule>`), always at the same version, because it re-exports that package rather than copying it. Installing it does not install ESLint.

## Why pg-specific?

A generic SQL injection linter can flag string concatenation wherever it appears, but it cannot know the parameterization convention for each database client. The `pg` (node-postgres) driver uses `$1, $2, …` positional placeholders with a second-argument array — a pattern no generic rule encodes. `eslint-plugin-postgresql-security` knows this contract: it only fires on `.query()` calls, it stays silent when a second argument (the values array) is present, and it tracks variable taint across assignment statements so that a split-line pattern like `const sql = "SELECT..." + id; client.query(sql)` is flagged even though the concatenation and the query call are on separate lines. The result is a rule with near-zero false positives on legitimate parameterized queries and reliable detection on the patterns that actually lead to SQL injection.

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
npm install oxlint-plugin-postgresql-security --save-dev
```

### Vite+

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: ['oxlint-plugin-postgresql-security'],
    rules: {
      'postgresql-security/no-hardcoded-credentials': 'error',
      'postgresql-security/no-insecure-ssl': 'error',
      'postgresql-security/no-missing-client-release': 'error',
      'postgresql-security/no-transaction-on-pool': 'error',
      'postgresql-security/no-unsafe-copy-from': 'error',
      'postgresql-security/no-unsafe-query': 'error',
      'postgresql-security/no-unsafe-search-path': 'error',
    },
  },
});
```

### oxlint

```json
{
  "jsPlugins": ["oxlint-plugin-postgresql-security"],
  "rules": {
    "postgresql-security/no-hardcoded-credentials": "error",
    "postgresql-security/no-insecure-ssl": "error",
    "postgresql-security/no-missing-client-release": "error",
    "postgresql-security/no-transaction-on-pool": "error",
    "postgresql-security/no-unsafe-copy-from": "error",
    "postgresql-security/no-unsafe-query": "error",
    "postgresql-security/no-unsafe-search-path": "error"
  }
}
```

These are the rules the plugin recommends (💼 in the table below).

### ESLint

Install [`eslint-plugin-postgresql-security`](https://www.npmjs.com/package/eslint-plugin-postgresql-security) instead. It has the same rules, plus presets for ESLint's flat config.

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

| Rule                                                                                                                                                                                                                      |   CWE   |  OWASP   | CVSS | Description                                                                              | 🧠  | 💼  | ⚠️  | 🔧  | 💡  | 🚫  |
| :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :-----: | :------: | :--: | :--------------------------------------------------------------------------------------- | :-: | :-: | :-: | :-: | :-: | :-: |
| [check-query-params](https://eslint.interlace.tools/docs/security/plugin-postgresql-security/rules/check-query-params?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-postgresql-security)               | CWE-89  |          |      | Ensures the number of placeholders in SQL queries matches the provided parameters.       | 🟢  |     | ⚠️  |     |     |     |
| [no-batch-insert-loop](https://eslint.interlace.tools/docs/security/plugin-postgresql-security/rules/no-batch-insert-loop?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-postgresql-security)           | CWE-400 |          |      | Prevents INSERT/UPDATE/DELETE queries inside loops (N+1 query anti-pattern).             | 🟢  |     | ⚠️  |     |     |     |
| [no-floating-query](https://eslint.interlace.tools/docs/security/plugin-postgresql-security/rules/no-floating-query?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-postgresql-security)                 | CWE-252 |          |      | Ensures query promises are awaited or handled.                                           | 🟢  |     | ⚠️  |     |     |     |
| [no-hardcoded-credentials](https://eslint.interlace.tools/docs/security/plugin-postgresql-security/rules/no-hardcoded-credentials?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-postgresql-security)   | CWE-798 |          |      | Prevents hardcoded passwords and connection strings in PostgreSQL client initialization. | 🟢  | 💼  |     |     |     |     |
| [no-insecure-ssl](https://eslint.interlace.tools/docs/security/plugin-postgresql-security/rules/no-insecure-ssl?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-postgresql-security)                     | CWE-295 |          |      | Prevents disabling SSL certificate validation in PostgreSQL connections.                 | 🟢  | 💼  |     |     |     |     |
| [no-missing-client-release](https://eslint.interlace.tools/docs/security/plugin-postgresql-security/rules/no-missing-client-release?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-postgresql-security) | CWE-772 |          |      | Ensures acquired pool clients are released back to the pool.                             | 🟢  | 💼  |     |     |     |     |
| [no-select-all](https://eslint.interlace.tools/docs/security/plugin-postgresql-security/rules/no-select-all?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-postgresql-security)                         | CWE-693 |          |      | Discourages SELECT in favor of explicit column lists.                                    | 🟢  |     | ⚠️  |     |     |     |
| [no-transaction-on-pool](https://eslint.interlace.tools/docs/security/plugin-postgresql-security/rules/no-transaction-on-pool?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-postgresql-security)       | CWE-362 |          |      | Prevents running transaction commands directly on pool (must use dedicated client).      | 🟢  | 💼  |     |     |     |     |
| [no-unsafe-copy-from](https://eslint.interlace.tools/docs/security/plugin-postgresql-security/rules/no-unsafe-copy-from?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-postgresql-security)             | CWE-73  | A03:2021 |      | Prevents COPY FROM with file paths (should use STDIN for safe client-side data loading). | 🟢  | 💼  |     |     |     |     |
| [no-unsafe-query](https://eslint.interlace.tools/docs/security/plugin-postgresql-security/rules/no-unsafe-query?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-postgresql-security)                     | CWE-89  |          |      | SQL injection is one of the most critical security vulnerabilities                       | 🟢  | 💼  |     |     |     |     |
| [no-unsafe-search-path](https://eslint.interlace.tools/docs/security/plugin-postgresql-security/rules/no-unsafe-search-path?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-postgresql-security)         | CWE-426 |          |      | Prevents dynamic SET searchpath queries that could enable schema hijacking.              | 🟢  | 💼  |     |     |     |     |
| [prefer-pool-query](https://eslint.interlace.tools/docs/security/plugin-postgresql-security/rules/prefer-pool-query?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-postgresql-security)                 | CWE-693 |          |      | Suggests using pool.query() for single-shot queries instead of manual connect/release.   | 🟢  |     | ⚠️  |     |     |     |
| [prevent-double-release](https://eslint.interlace.tools/docs/security/plugin-postgresql-security/rules/prevent-double-release?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-postgresql-security)       | CWE-415 |          |      | Prevents calling client.release() multiple times on the same client.                     | 🟢  |     | ⚠️  |     |     |     |

## ⭐ Support & follow

If this plugin caught a real bug for you, **[star the repo](https://github.com/ofri-peretz/eslint)** — stars are the signal that keeps the Interlace ESLint ecosystem maintained — and **[follow the writeups on Dev.to](https://dev.to/ofri-peretz)** for the benchmarks and security research behind these rules.

[![GitHub stars](https://img.shields.io/github/stars/ofri-peretz/eslint?style=social)](https://github.com/ofri-peretz/eslint)

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-postgresql-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-postgresql-security"><img src="https://eslint.interlace.tools/images/og-postgresql-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-postgresql-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-postgresql-security" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="70" /></picture></a>
</p>
