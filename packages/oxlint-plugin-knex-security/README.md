# oxlint-plugin-knex-security

The `knex-security` rules for [oxlint](https://oxc.rs/docs/guide/usage/linter) and
[Vite+](https://viteplus.dev). This package is the oxlint name for
[`eslint-plugin-knex-security`](https://www.npmjs.com/package/eslint-plugin-knex-security): the same rules, the same
rule IDs (`knex-security/<rule>`), and the same version. It contains no rule code of its own, and it
does not install ESLint.

## Install

```bash
npm install --save-dev oxlint-plugin-knex-security
```

## Vite+

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: ['oxlint-plugin-knex-security'],
    rules: {
      'knex-security/<rule>': 'error',
    },
  },
});
```

## oxlint

```json
{
  "jsPlugins": ["oxlint-plugin-knex-security"],
  "rules": {
    "knex-security/<rule>": "error"
  }
}
```

## Rules

Every rule, its options and its docs are listed in the
[`eslint-plugin-knex-security` README](https://www.npmjs.com/package/eslint-plugin-knex-security#rules). Using ESLint
instead? Install `eslint-plugin-knex-security` directly.

## License

MIT

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-knex-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-knex-security"><img src="https://eslint.interlace.tools/images/og-knex-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>
