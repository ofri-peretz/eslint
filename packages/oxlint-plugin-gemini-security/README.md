# oxlint-plugin-gemini-security

The `gemini-security` rules for [oxlint](https://oxc.rs/docs/guide/usage/linter) and
[Vite+](https://viteplus.dev). This package is the oxlint name for
[`eslint-plugin-gemini-security`](https://www.npmjs.com/package/eslint-plugin-gemini-security): the same rules, the same
rule IDs (`gemini-security/<rule>`), and the same version. It contains no rule code of its own, and it
does not install ESLint.

## Install

```bash
npm install --save-dev oxlint-plugin-gemini-security
```

## Vite+

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: ['oxlint-plugin-gemini-security'],
    rules: {
      'gemini-security/<rule>': 'error',
    },
  },
});
```

## oxlint

```json
{
  "jsPlugins": ["oxlint-plugin-gemini-security"],
  "rules": {
    "gemini-security/<rule>": "error"
  }
}
```

## Rules

Every rule, its options and its docs are listed in the
[`eslint-plugin-gemini-security` README](https://www.npmjs.com/package/eslint-plugin-gemini-security#rules). Using ESLint
instead? Install `eslint-plugin-gemini-security` directly.

## License

MIT

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-gemini-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-gemini-security"><img src="https://eslint.interlace.tools/images/og-gemini-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>
