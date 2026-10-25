# oxlint-plugin-openai-security

The `openai-security` rules for [oxlint](https://oxc.rs/docs/guide/usage/linter) and
[Vite+](https://viteplus.dev). This package is the oxlint name for
[`eslint-plugin-openai-security`](https://www.npmjs.com/package/eslint-plugin-openai-security): the same rules, the same
rule IDs (`openai-security/<rule>`), and the same version. It contains no rule code of its own, and it
does not install ESLint.

## Install

```bash
npm install --save-dev oxlint-plugin-openai-security
```

## Vite+

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: ['oxlint-plugin-openai-security'],
    rules: {
      'openai-security/<rule>': 'error',
    },
  },
});
```

## oxlint

```json
{
  "jsPlugins": ["oxlint-plugin-openai-security"],
  "rules": {
    "openai-security/<rule>": "error"
  }
}
```

## Rules

Every rule, its options and its docs are listed in the
[`eslint-plugin-openai-security` README](https://www.npmjs.com/package/eslint-plugin-openai-security#rules). Using ESLint
instead? Install `eslint-plugin-openai-security` directly.

## License

MIT

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-openai-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-openai-security"><img src="https://eslint.interlace.tools/images/og-openai-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>
