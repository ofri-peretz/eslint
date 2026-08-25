<p align="center">
  <a href="https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-gemini-security" target="blank"><img src="https://eslint.interlace.tools/logos/interlace.svg" alt="Interlace" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://ai.google.dev" target="_blank"><img src="https://eslint.interlace.tools/logos/gemini.svg" alt="Google Gemini SDK" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://oxc.rs" target="_blank"><img src="https://eslint.interlace.tools/logos/oxlint.svg" alt="oxlint" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://eslint.org" target="_blank"><img src="https://eslint.interlace.tools/logos/eslint.svg" alt="ESLint" height="90" /></a>
</p>

<p align="center">
  Security rules for the Google Gemini SDK (@google/genai).
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-gemini-security" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-gemini-security.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-gemini-security" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-gemini-security.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/ofri-peretz/eslint" target="_blank"><img src="https://api.securityscorecards.dev/projects/github.com/ofri-peretz/eslint/badge" alt="OpenSSF Scorecard" /></a>
</p>

> ⭐ If this plugin caught a real bug for you, [**star the repo**](https://github.com/ofri-peretz/eslint) — it's the signal that keeps these rules maintained.

## Description

Security rules for [`@google/genai`](https://www.npmjs.com/package/@google/genai).

Every rule gates on the SDK actually being imported, so the plugin stays silent in files that don't use it.

## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

<!-- AUTO-GENERATED:DOCTRINE:START - Do not edit manually -->

## Why these rules are quiet

**Noise creates apathy, and apathy is not a security posture.** A linter that reports
a thousand things a week gets switched off in a month, and the real finding goes with
it. So every rule here is built to be worth reading: we would rather miss a finding
than spend your attention on one that was never real.

That is a trade, and it is made deliberately. It costs recall, and we measure what it
costs rather than assuming it is free.

## How the rules decide

**Evidence, not names.** A rule fires on what the code *does*, resolved through the
AST and ESLint's own scope analysis — not on an identifier that happens to contain
`query`, a method called `setItem`, or a file whose path contains `key`. Every one of
those was a real false positive in this ecosystem, found by reading our own output on
open-source projects and fixed with a test that fails on the unfixed rule.

Where a rule has known false-positive shapes, its page carries a **Not a finding**
section: what it deliberately stays quiet on, and what to check first when it fires
and you disagree.

## What you get

The rules below. Security rules carry a CWE mapping and, where one is assigned, a
CVSS score; every rule carries a fix on its message — in prose for a human and as
structured JSON for an agent. Install it, enable
`recommended`, and read the findings. If one of them is wrong,
[open an issue](https://github.com/ofri-peretz/eslint/issues) — a false positive is a
bug here, not a tuning exercise for you.

How that is measured, on which projects, and where it falls short:
[benchmark methodology](https://github.com/ofri-peretz/eslint/blob/main/BENCHMARK-METHODOLOGY.md)
and [results](https://github.com/ofri-peretz/eslint/blob/main/BENCHMARK-RESULTS.md).

<!-- AUTO-GENERATED:DOCTRINE:END -->

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/security/plugin-gemini-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-gemini-security), visit [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-gemini-security). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/security/plugin-gemini-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-gemini-security), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-gemini-security). 📚
- [가이드](https://eslint.interlace.tools/docs/security/plugin-gemini-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-gemini-security) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-gemini-security)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/security/plugin-gemini-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-gemini-security)は [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-gemini-security)でご確認ください。 📚
- Para ver la [guía](https://eslint.interlace.tools/docs/security/plugin-gemini-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-gemini-security), visita [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-gemini-security). 📚
- للاطلاع على [الدليل](https://eslint.interlace.tools/docs/security/plugin-gemini-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-gemini-security)، قم بزيارة [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-gemini-security). 📚

```bash
npm install eslint-plugin-gemini-security --save-dev
```

## ⚙️ Configuration Presets

| Preset | Description |
| :--- | :--- |
| `recommended` | Enables every rule at `error`. |
| `strict` | Same set as `recommended`; reserved for rules that are not yet safe by default. |
| `minimal` | Same set as `recommended`; reserved for a reduced high-signal subset. |

## Usage

```js
// eslint.config.js
import geminiSecurity from 'eslint-plugin-gemini-security';

export default [
  geminiSecurity.configs.recommended,
];
```

### oxlint

Every rule runs on [oxlint](https://oxc.rs) as well as ESLint:

```json
{ "jsPlugins": ["eslint-plugin-gemini-security/oxlint"] }
```

## 📦 Compatibility

| Package | Version |
| :--- | :--- |
| `@google/genai` | [![npm](https://img.shields.io/npm/v/@google/genai.svg?style=flat-square)](https://www.npmjs.com/package/@google/genai) |
| ESLint | [![npm](https://img.shields.io/npm/v/eslint.svg?style=flat-square)](https://www.npmjs.com/package/eslint) |
| Node.js | [![node](https://img.shields.io/badge/node-%5E18.0.0-green?style=flat-square)](https://nodejs.org/) |

See the [ESLint Version Support Policy](../../docs/ESLINT_VERSION_SUPPORT.md) for the full matrix.

## Rules

**Legend**

| Icon | Description |
| :---: | :--- |
| 💼 | **Recommended**: Included in the recommended preset. |
| ⚠️ | **Warns**: Set to warn in recommended preset. |
| 🔧 | **Auto-fixable**: Automatically fixable by the `--fix` CLI option. |
| 💡 | **Suggestions**: Providing code suggestions in IDE. |
| 🚫 | **Deprecated**: This rule is deprecated. |
| 🟢 | **Type-unaware**: AST-only, runs in oxlint JS-plugin tier. |
| 🟡 | **Type-aware (refining)**: pure-AST primary path; types refine precision. |
| 🟠 | **Type-aware (graceful)**: requires TS program; silent without it. |

<!-- AUTO-GENERATED:RULES_TABLE:START - Do not edit manually -->
| Rule | CWE | OWASP | CVSS | Description | 🧠 | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| [no-disabled-safety-settings](https://eslint.interlace.tools/docs/security/plugin-gemini-security/rules/no-disabled-safety-settings?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-gemini-security) | CWE-693 | A04:2021 |  | Forbid disabling Gemini harm-category filters | 🟢 |  |  |  |  |  |
| [no-hardcoded-api-key](https://eslint.interlace.tools/docs/security/plugin-gemini-security/rules/no-hardcoded-api-key?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-gemini-security) | CWE-798 | A07:2021 |  | Forbid a literal API key in the Gemini client construction | 🟢 |  |  |  |  |  |
| [no-untrusted-content-in-prompt](https://eslint.interlace.tools/docs/security/plugin-gemini-security/rules/no-untrusted-content-in-prompt?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-gemini-security) | CWE-1427 | A03:2021 |  | Disallow untrusted content built into the Gemini system prompt | 🟢 |  |  |  |  |  |
<!-- AUTO-GENERATED:RULES_TABLE:END -->
<!-- INTERLACE:STAR_CTA:START -->
## ⭐ Support & follow

If this plugin caught a real bug for you, **[star the repo](https://github.com/ofri-peretz/eslint)** — stars are the signal that keeps the Interlace ESLint ecosystem maintained — and **[follow the writeups on Dev.to](https://dev.to/ofri-peretz)** for the benchmarks and security research behind these rules.

[![GitHub stars](https://img.shields.io/github/stars/ofri-peretz/eslint?style=social)](https://github.com/ofri-peretz/eslint)

<!-- INTERLACE:STAR_CTA:END -->

## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint Ecosystem** — AI-native security plugins with LLM-optimized error messages:

| Plugin | Downloads | Description |
| :--- | :---: | :--- |
| [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-vercel-ai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | Vercel AI SDK security — prompt injection, output handling. |
| [`eslint-plugin-openai-security`](https://www.npmjs.com/package/eslint-plugin-openai-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-openai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-openai-security) | OpenAI SDK security. |
| [`eslint-plugin-anthropic-security`](https://www.npmjs.com/package/eslint-plugin-anthropic-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-anthropic-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-anthropic-security) | Anthropic SDK and Claude Agent SDK security. |
| [`eslint-plugin-gemini-security`](https://www.npmjs.com/package/eslint-plugin-gemini-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-gemini-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-gemini-security) | Google Gemini SDK security. |
| [`eslint-plugin-mcp-sdk-security`](https://www.npmjs.com/package/eslint-plugin-mcp-sdk-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-mcp-sdk-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-mcp-sdk-security) | Model Context Protocol SDK security. |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-secure-coding.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-secure-coding) | General security rules & OWASP guidelines. |
| [`eslint-plugin-node-security`](https://www.npmjs.com/package/eslint-plugin-node-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-node-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-node-security) | Node.js core-module security (fs, child_process, vm, crypto, Buffer). |

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-gemini-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-gemini-security"><img src="https://eslint.interlace.tools/images/og-gemini-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>

<p align="center">
  <a href="https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-gemini-security" target="blank"><img src="https://eslint.interlace.tools/icon-light.svg" alt="Interlace" height="70" /></a>
</p>
