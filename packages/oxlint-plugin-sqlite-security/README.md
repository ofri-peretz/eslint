# oxlint-plugin-sqlite-security

The `sqlite-security` rules for [oxlint](https://oxc.rs/docs/guide/usage/linter) and
[Vite+](https://viteplus.dev). This package is the oxlint name for
[`eslint-plugin-sqlite-security`](https://www.npmjs.com/package/eslint-plugin-sqlite-security): the same rules, the same
rule IDs (`sqlite-security/<rule>`), and the same version. It contains no rule code of its own, and it
does not install ESLint.

## Install

```bash
npm install --save-dev oxlint-plugin-sqlite-security
```

## Vite+

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: ['oxlint-plugin-sqlite-security'],
    rules: {
      'sqlite-security/<rule>': 'error',
    },
  },
});
```

## oxlint

```json
{
  "jsPlugins": ["oxlint-plugin-sqlite-security"],
  "rules": {
    "sqlite-security/<rule>": "error"
  }
}
```

## Rules

Every rule, its options and its docs are listed in the
[`eslint-plugin-sqlite-security` README](https://www.npmjs.com/package/eslint-plugin-sqlite-security#rules). Using ESLint
instead? Install `eslint-plugin-sqlite-security` directly.

## License

MIT

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-sqlite-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-sqlite-security"><img src="https://eslint.interlace.tools/images/og-sqlite-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>
