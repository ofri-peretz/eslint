# oxlint-plugin-mysql-security

The `mysql-security` rules for [oxlint](https://oxc.rs/docs/guide/usage/linter) and
[Vite+](https://viteplus.dev). This package is the oxlint name for
[`eslint-plugin-mysql-security`](https://www.npmjs.com/package/eslint-plugin-mysql-security): the same rules, the same
rule IDs (`mysql-security/<rule>`), and the same version. It contains no rule code of its own, and it
does not install ESLint.

## Install

```bash
npm install --save-dev oxlint-plugin-mysql-security
```

## Vite+

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: ['oxlint-plugin-mysql-security'],
    rules: {
      'mysql-security/<rule>': 'error',
    },
  },
});
```

## oxlint

```json
{
  "jsPlugins": ["oxlint-plugin-mysql-security"],
  "rules": {
    "mysql-security/<rule>": "error"
  }
}
```

## Rules

Every rule, its options and its docs are listed in the
[`eslint-plugin-mysql-security` README](https://www.npmjs.com/package/eslint-plugin-mysql-security#rules). Using ESLint
instead? Install `eslint-plugin-mysql-security` directly.

## License

MIT

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-mysql-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-mysql-security"><img src="https://eslint.interlace.tools/images/og-mysql-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>
