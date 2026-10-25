# oxlint-plugin-sequelize-security

The `sequelize-security` rules for [oxlint](https://oxc.rs/docs/guide/usage/linter) and
[Vite+](https://viteplus.dev). This package is the oxlint name for
[`eslint-plugin-sequelize-security`](https://www.npmjs.com/package/eslint-plugin-sequelize-security): the same rules, the same
rule IDs (`sequelize-security/<rule>`), and the same version. It contains no rule code of its own, and it
does not install ESLint.

## Install

```bash
npm install --save-dev oxlint-plugin-sequelize-security
```

## Vite+

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: ['oxlint-plugin-sequelize-security'],
    rules: {
      'sequelize-security/<rule>': 'error',
    },
  },
});
```

## oxlint

```json
{
  "jsPlugins": ["oxlint-plugin-sequelize-security"],
  "rules": {
    "sequelize-security/<rule>": "error"
  }
}
```

## Rules

Every rule, its options and its docs are listed in the
[`eslint-plugin-sequelize-security` README](https://www.npmjs.com/package/eslint-plugin-sequelize-security#rules). Using ESLint
instead? Install `eslint-plugin-sequelize-security` directly.

## License

MIT

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-sequelize-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-sequelize-security"><img src="https://eslint.interlace.tools/images/og-sequelize-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>
