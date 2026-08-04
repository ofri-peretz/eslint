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
</p>

> ⭐ If this plugin caught a real bug for you, [**star the repo**](https://github.com/ofri-peretz/eslint) — it's the signal that keeps these rules maintained.

## Description

Security rules for [`@google/genai`](https://www.npmjs.com/package/@google/genai).

Every rule gates on the SDK actually being imported, so the plugin stays silent in files that don't use it.

## Installation

```bash
npm install --save-dev eslint-plugin-gemini-security
```

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

## Rules

| Rule | Description | CWE | Recommended |
| --- | --- | --- | --- |
| [no-disabled-safety-settings](./docs/rules/no-disabled-safety-settings.md) | Forbid disabling Gemini harm-category filters | CWE-693 | ✅ error |

<!-- INTERLACE:STAR_CTA:START -->
## ⭐ Support & follow

If this plugin caught a real bug for you, **[star the repo](https://github.com/ofri-peretz/eslint)** — stars are the signal that keeps the Interlace ESLint ecosystem maintained — and **[follow the writeups on Dev.to](https://dev.to/ofri-peretz)** for the benchmarks and security research behind these rules.

[![GitHub stars](https://img.shields.io/github/stars/ofri-peretz/eslint?style=social)](https://github.com/ofri-peretz/eslint)

<!-- INTERLACE:STAR_CTA:END -->

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-gemini-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-gemini-security"><img src="https://eslint.interlace.tools/images/og-gemini-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>


<p align="center">
  <a href="https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-gemini-security" target="blank"><img src="https://eslint.interlace.tools/icon-light.svg" alt="Interlace" height="70" /></a>
</p>
