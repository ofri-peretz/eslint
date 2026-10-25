<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-vercel-ai-security" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="90" /></picture></a>
  &nbsp;&nbsp;
  <a href="https://vercel.com/docs/ai-sdk" target="_blank"><img src="https://eslint.interlace.tools/logos/vercel.svg" alt="Vercel AI SDK" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://oxc.rs" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/oxlint-dark.svg"><img src="https://eslint.interlace.tools/logos/oxlint-light.svg" alt="oxlint" height="90" /></picture></a>
</p>

<p align="center">
  Security rules for Vercel AI SDK usage (prompt injection, data handling).
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/oxlint-plugin-vercel-ai-security" target="_blank"><img src="https://img.shields.io/npm/v/oxlint-plugin-vercel-ai-security.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/oxlint-plugin-vercel-ai-security" target="_blank"><img src="https://img.shields.io/npm/dm/oxlint-plugin-vercel-ai-security.svg" alt="NPM Downloads" /></a>
  <a href="https://packagephobia.com/result?p=oxlint-plugin-vercel-ai-security" target="_blank"><img src="https://badgen.net/packagephobia/install/oxlint-plugin-vercel-ai-security" alt="Install Size" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://app.codecov.io/gh/ofri-peretz/eslint/components?components%5B0%5D=eslint-plugin-vercel-ai-security" target="_blank"><img src="https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=eslint-plugin-vercel-ai-security" alt="Codecov" /></a>
  <a href="https://github.com/ofri-peretz/eslint" target="_blank"><img src="https://img.shields.io/badge/Since-Dec_2025-blue?logo=rocket&logoColor=white" alt="Since Dec 2025" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/ofri-peretz/eslint" target="_blank"><img src="https://api.securityscorecards.dev/projects/github.com/ofri-peretz/eslint/badge" alt="OpenSSF Scorecard" /></a>
</p>

> ⭐ If this plugin caught a real bug for you, [**star the repo**](https://github.com/ofri-peretz/eslint) — it's the signal that keeps these rules maintained.

## Description

`oxlint-plugin-vercel-ai-security` is the [oxlint](https://oxc.rs/docs/guide/usage/linter/js-plugins) and [Vite+](https://viteplus.dev/guide/lint) name for [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security). It carries the same rules under the same IDs (`vercel-ai-security/<rule>`), always at the same version, because it re-exports that package rather than copying it. Installing it does not install ESLint.

## Covered natively by oxlint

None of these 19 rules has an oxlint built-in equivalent. Every rule here is new to oxlint.

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
npm install oxlint-plugin-vercel-ai-security --save-dev
```

### Vite+

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: ['oxlint-plugin-vercel-ai-security'],
    rules: {
      'vercel-ai-security/no-dynamic-system-prompt': 'error',
    },
  },
});
```

### oxlint

```json
{
  "jsPlugins": ["oxlint-plugin-vercel-ai-security"],
  "rules": {
    "vercel-ai-security/no-dynamic-system-prompt": "error"
  }
}
```

That enables one rule as an example; add the ones you want from the table below.

### ESLint

Install [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) instead. It has the same rules, plus presets for ESLint's flat config.

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

| Rule                                                                                                                                                                                                                              |   CWE   | OWASP | CVSS | Description                                                                                                  | 🧠  | 💼  | ⚠️  | 🔧  | 💡  | 🚫  |
| :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-----: | :---: | :--: | :----------------------------------------------------------------------------------------------------------- | :-: | :-: | :-: | :-: | :-: | :-: |
| [no-dynamic-system-prompt](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/no-dynamic-system-prompt?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-vercel-ai-security)             | CWE-74  |       |      | This rule identifies code patterns where system prompts contain dynamic or user-controlled content           | 🟢  |     |     |     |     |     |
| [no-hardcoded-api-keys](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/no-hardcoded-api-keys?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-vercel-ai-security)                   | CWE-798 |       |      | This rule identifies hardcoded API keys, tokens, and secrets in your codebase that are used with AI SDK pro… | 🟢  |     |     |     |     |     |
| [no-sensitive-in-prompt](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/no-sensitive-in-prompt?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-vercel-ai-security)                 | CWE-200 |       |      | This rule identifies code patterns where sensitive data like passwords, API keys, tokens, or personally ide… | 🟢  |     |     |     |     |     |
| [no-system-prompt-leak](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/no-system-prompt-leak?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-vercel-ai-security)                   | CWE-200 |       |      | This rule identifies code patterns where system prompts or AI instructions are returned in API responses, l… | 🟢  |     |     |     |     |     |
| [no-training-data-exposure](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/no-training-data-exposure?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-vercel-ai-security)           | CWE-359 |       |      | This rule identifies code patterns where user data might be sent to LLM training endpoints or when training… | 🟢  |     |     |     |     |     |
| [no-unsafe-output-handling](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/no-unsafe-output-handling?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-vercel-ai-security)           | CWE-94  |       |      | This rule identifies code patterns where AI-generated output is passed directly to dangerous functions that… | 🟢  |     |     |     |     |     |
| [require-abort-signal](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/require-abort-signal?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-vercel-ai-security)                     | CWE-404 |       |      | This rule identifies streaming AI SDK calls (streamText, streamObject) that don't include an AbortSignal fo… | 🟢  |     |     |     |     |     |
| [require-audit-logging](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/require-audit-logging?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-vercel-ai-security)                   | CWE-778 |       |      | This rule identifies AI SDK calls that aren't preceded by logging statements                                 | 🟢  |     |     |     |     |     |
| [require-embedding-validation](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/require-embedding-validation?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-vercel-ai-security)     | CWE-20  |       |      | This rule identifies code patterns where embeddings are stored in vector databases without validation.       | 🟢  |     |     |     |     |     |
| [require-error-handling](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/require-error-handling?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-vercel-ai-security)                 | CWE-755 |       |      | This rule identifies AI SDK calls that aren't wrapped in try-catch blocks                                    | 🟢  |     |     |     |     |     |
| [require-max-steps](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/require-max-steps?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-vercel-ai-security)                           | CWE-834 |       |      | This rule identifies tool-calling AI SDK calls whose step limit does not bound the loop: a hasToolCall-only… | 🟢  |     |     |     |     |     |
| [require-max-tokens](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/require-max-tokens?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-vercel-ai-security)                         | CWE-770 |       |      | This rule identifies AI SDK calls that don't specify a token limit (maxTokens or maxOutputTokens)            | 🟢  |     |     |     |     |     |
| [require-output-filtering](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/require-output-filtering?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-vercel-ai-security)             | CWE-200 |       |      | This rule identifies tool execute functions that return raw data from data sources (databases, APIs, file s… | 🟢  |     |     |     |     |     |
| [require-output-validation](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/require-output-validation?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-vercel-ai-security)           | CWE-707 |       |      | This rule identifies code patterns where AI-generated output is displayed to users without validation or fa… | 🟢  |     |     |     |     |     |
| [require-rag-content-validation](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/require-rag-content-validation?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-vercel-ai-security) | CWE-74  |       |      | This rule identifies code patterns where content retrieved from vector stores or document retrieval systems… | 🟢  |     |     |     |     |     |
| [require-request-timeout](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/require-request-timeout?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-vercel-ai-security)               | CWE-400 |       |      | This rule identifies AI SDK calls that don't have timeout or abort signal configuration.                     | 🟢  |     |     |     |     |     |
| [require-tool-confirmation](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/require-tool-confirmation?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-vercel-ai-security)           | CWE-862 |       |      | This rule identifies destructive tools (delete, transfer, execute, etc.) that don't require human confirmat… | 🟢  |     |     |     |     |     |
| [require-tool-schema](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/require-tool-schema?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-vercel-ai-security)                       | CWE-20  |       |      | Get weather                                                                                                  | 🟢  |     |     |     |     |     |
| [require-validated-prompt](https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security/rules/require-validated-prompt?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-vercel-ai-security)             | CWE-74  |       |      | This rule identifies code patterns where user-controlled input is passed directly to AI prompts without val… | 🟢  |     |     |     |     |     |

## ⭐ Support & follow

If this plugin caught a real bug for you, **[star the repo](https://github.com/ofri-peretz/eslint)** — stars are the signal that keeps the Interlace ESLint ecosystem maintained — and **[follow the writeups on Dev.to](https://dev.to/ofri-peretz)** for the benchmarks and security research behind these rules.

[![GitHub stars](https://img.shields.io/github/stars/ofri-peretz/eslint?style=social)](https://github.com/ofri-peretz/eslint)

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-vercel-ai-security"><img src="https://eslint.interlace.tools/images/og-vercel-ai-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-vercel-ai-security" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="70" /></picture></a>
</p>
