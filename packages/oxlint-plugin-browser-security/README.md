# oxlint-plugin-browser-security

The `browser-security` rules for [oxlint](https://oxc.rs/docs/guide/usage/linter) and
[Vite+](https://viteplus.dev). This package is the oxlint name for
[`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security): the same rules, the same
rule IDs (`browser-security/<rule>`), and the same version. It contains no rule code of its own, and it
does not install ESLint.

## Install

```bash
npm install --save-dev oxlint-plugin-browser-security
```

## Vite+

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: ['oxlint-plugin-browser-security'],
    rules: {
      'browser-security/<rule>': 'error',
    },
  },
});
```

## oxlint

```json
{
  "jsPlugins": ["oxlint-plugin-browser-security"],
  "rules": {
    "browser-security/<rule>": "error"
  }
}
```

## Rules

Every rule, its options and its docs are listed in the
[`eslint-plugin-browser-security` README](https://www.npmjs.com/package/eslint-plugin-browser-security#rules). Using ESLint
instead? Install `eslint-plugin-browser-security` directly.

## License

MIT

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-browser-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-browser-security"><img src="https://eslint.interlace.tools/images/og-browser-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>
