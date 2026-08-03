<p align="center">
  <a href="https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-anthropic-security" target="blank"><img src="https://eslint.interlace.tools/icon-light.svg" alt="Interlace" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://eslint.org" target="_blank"><img src="https://eslint.interlace.tools/eslint-logo.svg" alt="ESLint" height="90" /></a>
</p>

<p align="center">
  Security rules for the Anthropic SDK and Claude Agent SDK.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-anthropic-security" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-anthropic-security.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-anthropic-security" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-anthropic-security.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
</p>

> ⭐ If this plugin caught a real bug for you, [**star the repo**](https://github.com/ofri-peretz/eslint) — it's the signal that keeps these rules maintained.

## Description

Security rules for [`@anthropic-ai/sdk`](https://www.npmjs.com/package/@anthropic-ai/sdk).

Every rule gates on the SDK actually being imported, so the plugin stays silent in files that don't use it.

## Installation

```bash
npm install --save-dev eslint-plugin-anthropic-security
```

## Usage

```js
// eslint.config.js
import anthropicSecurity from 'eslint-plugin-anthropic-security';

export default [
  anthropicSecurity.configs.recommended,
];
```

### oxlint

Every rule runs on [oxlint](https://oxc.rs) as well as ESLint:

```json
{ "jsPlugins": ["eslint-plugin-anthropic-security/oxlint"] }
```

## Rules

| Rule | Description | CWE | Recommended |
| --- | --- | --- | --- |
| [no-hardcoded-api-key](./docs/rules/no-hardcoded-api-key.md) | Forbid a literal API key in the Anthropic client options | CWE-798 | ✅ error |

<!-- INTERLACE:STAR_CTA:START -->
## ⭐ Support & follow

If this plugin caught a real bug for you, **[star the repo](https://github.com/ofri-peretz/eslint)** — stars are the signal that keeps the Interlace ESLint ecosystem maintained — and **[follow the writeups on Dev.to](https://dev.to/ofri-peretz)** for the benchmarks and security research behind these rules.

[![GitHub stars](https://img.shields.io/github/stars/ofri-peretz/eslint?style=social)](https://github.com/ofri-peretz/eslint)

<!-- INTERLACE:STAR_CTA:END -->

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-anthropic-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-anthropic-security"><img src="https://eslint.interlace.tools/images/og-anthropic-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>


<p align="center">
  <a href="https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-anthropic-security" target="blank"><img src="https://eslint.interlace.tools/icon-light.svg" alt="Interlace" height="70" /></a>
</p>
