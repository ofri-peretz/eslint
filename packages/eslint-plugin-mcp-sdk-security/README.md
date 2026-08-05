<p align="center">
  <a href="https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mcp-sdk-security" target="blank"><img src="https://eslint.interlace.tools/logos/interlace.svg" alt="Interlace" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://modelcontextprotocol.io" target="_blank"><img src="https://eslint.interlace.tools/logos/mcp.svg" alt="Model Context Protocol" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://oxc.rs" target="_blank"><img src="https://eslint.interlace.tools/logos/oxlint.svg" alt="oxlint" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://eslint.org" target="_blank"><img src="https://eslint.interlace.tools/logos/eslint.svg" alt="ESLint" height="90" /></a>
</p>

<p align="center">
  Security rules for <a href="https://www.npmjs.com/package/@modelcontextprotocol/sdk">@modelcontextprotocol/sdk</a> — the Model Context Protocol SDK.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-mcp-sdk-security" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-mcp-sdk-security.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-mcp-sdk-security" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-mcp-sdk-security.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
</p>

> ⭐ If this plugin caught a real bug for you, [**star the repo**](https://github.com/ofri-peretz/eslint) — it's the signal that keeps these rules maintained.

## Description

Security rules for code built on [`@modelcontextprotocol/sdk`](https://www.npmjs.com/package/@modelcontextprotocol/sdk).

**Scope:** this plugin lints the MCP **SDK's API shapes** — `registerTool`, transports, handler signatures. It does not inspect MCP wire traffic, which isn't visible from source. Every rule gates on the SDK actually being imported, so it stays silent in files that don't use MCP.

## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Getting Started

- To check out the [guide](https://eslint.interlace.tools/docs/security/plugin-mcp-sdk-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mcp-sdk-security), visit [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mcp-sdk-security). 📚
- 要查看中文 [指南](https://eslint.interlace.tools/docs/security/plugin-mcp-sdk-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mcp-sdk-security), 请访问 [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mcp-sdk-security). 📚
- [가이드](https://eslint.interlace.tools/docs/security/plugin-mcp-sdk-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mcp-sdk-security) 문서는 [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mcp-sdk-security)에서 확인하실 수 있습니다. 📚
- [ガイド](https://eslint.interlace.tools/docs/security/plugin-mcp-sdk-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mcp-sdk-security)は [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mcp-sdk-security)でご確認ください。 📚
- Para ver la [guía](https://eslint.interlace.tools/docs/security/plugin-mcp-sdk-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mcp-sdk-security), visita [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mcp-sdk-security). 📚
- للاطلاع على [الدليل](https://eslint.interlace.tools/docs/security/plugin-mcp-sdk-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mcp-sdk-security)، قم بزيارة [eslint.interlace.tools](https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mcp-sdk-security). 📚

```bash
npm install eslint-plugin-mcp-sdk-security --save-dev
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
import mcpSdkSecurity from 'eslint-plugin-mcp-sdk-security';

export default [
  mcpSdkSecurity.configs.recommended,
];
```

Or wire the rules yourself:

```js
import mcpSdkSecurity from 'eslint-plugin-mcp-sdk-security';

export default [
  {
    plugins: { 'mcp-sdk-security': mcpSdkSecurity },
    rules: {
      'mcp-sdk-security/require-tool-input-schema': 'error',
    },
  },
];
```

### oxlint

Every rule in this plugin runs on [oxlint](https://oxc.rs) as well as ESLint:

```json
{ "jsPlugins": ["eslint-plugin-mcp-sdk-security/oxlint"] }
```

## 📦 Compatibility

| Package | Version |
| :--- | :--- |
| `@modelcontextprotocol/sdk` | [![npm](https://img.shields.io/npm/v/@modelcontextprotocol/sdk.svg?style=flat-square)](https://www.npmjs.com/package/@modelcontextprotocol/sdk) |
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

| Rule | CWE | OWASP | CVSS | Description | 🧠 | 💼 | ⚠️ | 🔧 | 💡 | 🚫 |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| [require-tool-input-schema](./docs/rules/require-tool-input-schema.md) | CWE-20 | A03:2021 | 7.5 | Require an input schema when registering an MCP tool | 🟢 | 💼 |  |  |  |  |

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
  <a href="https://eslint.interlace.tools/docs/security/plugin-mcp-sdk-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mcp-sdk-security"><img src="https://eslint.interlace.tools/images/og-mcp-sdk-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>

<p align="center">
  <a href="https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mcp-sdk-security" target="blank"><img src="https://eslint.interlace.tools/icon-light.svg" alt="Interlace" height="70" /></a>
</p>
