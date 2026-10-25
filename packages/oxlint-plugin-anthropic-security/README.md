# oxlint-plugin-anthropic-security

The `anthropic-security` rules for [oxlint](https://oxc.rs/docs/guide/usage/linter) and
[Vite+](https://viteplus.dev). This package is the oxlint name for
[`eslint-plugin-anthropic-security`](https://www.npmjs.com/package/eslint-plugin-anthropic-security): the same rules, the same
rule IDs (`anthropic-security/<rule>`), and the same version. It contains no rule code of its own, and it
does not install ESLint.

## Install

```bash
npm install --save-dev oxlint-plugin-anthropic-security
```

## Vite+

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: ['oxlint-plugin-anthropic-security'],
    rules: {
      'anthropic-security/<rule>': 'error',
    },
  },
});
```

## oxlint

```json
{
  "jsPlugins": ["oxlint-plugin-anthropic-security"],
  "rules": {
    "anthropic-security/<rule>": "error"
  }
}
```

## Rules

Every rule, its options and its docs are listed in the
[`eslint-plugin-anthropic-security` README](https://www.npmjs.com/package/eslint-plugin-anthropic-security#rules). Using ESLint
instead? Install `eslint-plugin-anthropic-security` directly.

## License

MIT

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-anthropic-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-anthropic-security"><img src="https://eslint.interlace.tools/images/og-anthropic-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>
