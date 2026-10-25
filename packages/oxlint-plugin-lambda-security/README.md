<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-lambda-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-lambda-security" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="90" /></picture></a>
  &nbsp;&nbsp;
  <a href="https://aws.amazon.com/lambda/" target="_blank"><img src="https://eslint.interlace.tools/logos/lambda.svg" alt="AWS Lambda" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://oxc.rs" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/oxlint-dark.svg"><img src="https://eslint.interlace.tools/logos/oxlint-light.svg" alt="oxlint" height="90" /></picture></a>
</p>

<p align="center">
  Security best practices for AWS Lambda functions (IAM, timeouts, environment).
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/oxlint-plugin-lambda-security" target="_blank"><img src="https://img.shields.io/npm/v/oxlint-plugin-lambda-security.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/oxlint-plugin-lambda-security" target="_blank"><img src="https://img.shields.io/npm/dm/oxlint-plugin-lambda-security.svg" alt="NPM Downloads" /></a>
  <a href="https://packagephobia.com/result?p=oxlint-plugin-lambda-security" target="_blank"><img src="https://badgen.net/packagephobia/install/oxlint-plugin-lambda-security" alt="Install Size" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=eslint-plugin-lambda-security" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=eslint-plugin-lambda-security" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/ofri-peretz/eslint" target="_blank"><img src="https://api.securityscorecards.dev/projects/github.com/ofri-peretz/eslint/badge" alt="OpenSSF Scorecard" /></a>
</p>

> ⭐ If this plugin caught a real bug for you, [**star the repo**](https://github.com/ofri-peretz/eslint) — it's the signal that keeps these rules maintained.

## Description

`oxlint-plugin-lambda-security` is the [oxlint](https://oxc.rs/docs/guide/usage/linter/js-plugins) and [Vite+](https://viteplus.dev/guide/lint) name for [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security). It carries the same rules under the same IDs (`lambda-security/<rule>`), always at the same version, because it re-exports that package rather than copying it. Installing it does not install ESLint.

## Covered natively by oxlint

None of these 14 rules has an oxlint built-in equivalent. Every rule here is new to oxlint.

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
npm install oxlint-plugin-lambda-security --save-dev
```

### Vite+

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: ['oxlint-plugin-lambda-security'],
    rules: {
      'lambda-security/no-exposed-debug-endpoints': 'error',
      'lambda-security/no-hardcoded-credentials-sdk': 'error',
      'lambda-security/no-overly-permissive-iam-policy': 'error',
      'lambda-security/no-permissive-cors-middy': 'error',
      'lambda-security/no-permissive-cors-response': 'error',
      'lambda-security/no-secrets-in-env': 'error',
      'lambda-security/no-user-controlled-requests': 'error',
    },
  },
});
```

### oxlint

```json
{
  "jsPlugins": ["oxlint-plugin-lambda-security"],
  "rules": {
    "lambda-security/no-exposed-debug-endpoints": "error",
    "lambda-security/no-hardcoded-credentials-sdk": "error",
    "lambda-security/no-overly-permissive-iam-policy": "error",
    "lambda-security/no-permissive-cors-middy": "error",
    "lambda-security/no-permissive-cors-response": "error",
    "lambda-security/no-secrets-in-env": "error",
    "lambda-security/no-user-controlled-requests": "error"
  }
}
```

These are the rules the plugin recommends (💼 in the table below).

### ESLint

Install [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security) instead. It has the same rules, plus presets for ESLint's flat config.

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
| [no-env-logging](https://eslint.interlace.tools/docs/security/plugin-lambda-security/rules/no-env-logging?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-lambda-security)                                   | CWE-532 | A09:2021 |      | Detect logging of process.env which may expose secrets                                                       | 🟢  |     | ⚠️  |     |     |     |
| [no-error-swallowing](https://eslint.interlace.tools/docs/security/plugin-lambda-security/rules/no-error-swallowing?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-lambda-security)                         | CWE-390 | A09:2021 |      | Detect empty catch blocks and missing error logging                                                          | 🟢  |     | ⚠️  |     |     |     |
| [no-exposed-debug-endpoints](https://eslint.interlace.tools/docs/security/plugin-lambda-security/rules/no-exposed-debug-endpoints?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-lambda-security)           | CWE-489 | A05:2021 |      | Detect debug endpoints without authentication in Lambda handlers                                             | 🟢  | 💼  |     |     |     |     |
| [no-exposed-error-details](https://eslint.interlace.tools/docs/security/plugin-lambda-security/rules/no-exposed-error-details?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-lambda-security)               | CWE-209 | A01:2021 |      | Detect Lambda handlers exposing internal error details in responses                                          | 🟢  |     | ⚠️  |     |     |     |
| [no-hardcoded-credentials-sdk](https://eslint.interlace.tools/docs/security/plugin-lambda-security/rules/no-hardcoded-credentials-sdk?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-lambda-security)       | CWE-798 |          |      | Detects hardcoded AWS credentials in SDK client configurations                                               | 🟢  | 💼  |     |     |     |     |
| [no-missing-authorization-check](https://eslint.interlace.tools/docs/security/plugin-lambda-security/rules/no-missing-authorization-check?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-lambda-security)   |         |          |      | Security rule for lambda-security. This rule is part of eslint-plugin-lambda-security and provides LLM-opti… | 🟢  |     | ⚠️  |     |     |     |
| [no-overly-permissive-iam-policy](https://eslint.interlace.tools/docs/security/plugin-lambda-security/rules/no-overly-permissive-iam-policy?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-lambda-security) | CWE-732 |          |      | Security rule for lambda-security. This rule is part of eslint-plugin-lambda-security and provides LLM-opti… | 🟢  | 💼  |     |     |     |     |
| [no-permissive-cors-middy](https://eslint.interlace.tools/docs/security/plugin-lambda-security/rules/no-permissive-cors-middy?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-lambda-security)               | CWE-942 |          |      | Detects permissive CORS configurations in Middy middleware                                                   | 🟢  | 💼  |     |     |     |     |
| [no-permissive-cors-response](https://eslint.interlace.tools/docs/security/plugin-lambda-security/rules/no-permissive-cors-response?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-lambda-security)         | CWE-942 |          |      | Detects permissive CORS headers in Lambda API Gateway responses                                              | 🟢  | 💼  |     |     |     |     |
| [no-secrets-in-env](https://eslint.interlace.tools/docs/security/plugin-lambda-security/rules/no-secrets-in-env?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-lambda-security)                             | CWE-798 |          |      | Detects secrets defined directly in environment variable configurations                                      | 🟢  | 💼  |     |     |     |     |
| [no-unbounded-batch-processing](https://eslint.interlace.tools/docs/security/plugin-lambda-security/rules/no-unbounded-batch-processing?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-lambda-security)     | CWE-770 |          |      | Detect processing batch records without size validation                                                      | 🟢  |     | ⚠️  |     |     |     |
| [no-unvalidated-event-body](https://eslint.interlace.tools/docs/security/plugin-lambda-security/rules/no-unvalidated-event-body?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-lambda-security)             | CWE-20  | A03:2021 |      | Detect Lambda handlers using event body without validation                                                   | 🟢  |     | ⚠️  |     |     |     |
| [no-user-controlled-requests](https://eslint.interlace.tools/docs/security/plugin-lambda-security/rules/no-user-controlled-requests?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-lambda-security)         | CWE-918 | A10:2021 |      | Detect HTTP requests with user-controlled URLs (SSRF)                                                        | 🟢  | 💼  |     |     |     |     |
| [require-timeout-handling](https://eslint.interlace.tools/docs/security/plugin-lambda-security/rules/require-timeout-handling?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-lambda-security)               | CWE-400 |          |      | Require timeout handling in Lambda handlers with external calls                                              | 🟢  |     | ⚠️  |     |     |     |

## ⭐ Support & follow

If this plugin caught a real bug for you, **[star the repo](https://github.com/ofri-peretz/eslint)** — stars are the signal that keeps the Interlace ESLint ecosystem maintained — and **[follow the writeups on Dev.to](https://dev.to/ofri-peretz)** for the benchmarks and security research behind these rules.

[![GitHub stars](https://img.shields.io/github/stars/ofri-peretz/eslint?style=social)](https://github.com/ofri-peretz/eslint)

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-lambda-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-lambda-security"><img src="https://eslint.interlace.tools/images/og-lambda-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-lambda-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-lambda-security" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="70" /></picture></a>
</p>
