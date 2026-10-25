# oxlint-plugin-postgresql-security

The `postgresql-security` rules for [oxlint](https://oxc.rs/docs/guide/usage/linter) and
[Vite+](https://viteplus.dev). This package is the oxlint name for
[`eslint-plugin-postgresql-security`](https://www.npmjs.com/package/eslint-plugin-postgresql-security): the same rules, the same
rule IDs (`postgresql-security/<rule>`), and the same version. It contains no rule code of its own, and it
does not install ESLint.

## Install

```bash
npm install --save-dev oxlint-plugin-postgresql-security
```

## Vite+

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: ['oxlint-plugin-postgresql-security'],
    rules: {
      'postgresql-security/<rule>': 'error',
    },
  },
});
```

## oxlint

```json
{
  "jsPlugins": ["oxlint-plugin-postgresql-security"],
  "rules": {
    "postgresql-security/<rule>": "error"
  }
}
```

## Rules

Every rule, its options and its docs are listed in the
[`eslint-plugin-postgresql-security` README](https://www.npmjs.com/package/eslint-plugin-postgresql-security#rules). Using ESLint
instead? Install `eslint-plugin-postgresql-security` directly.

## License

MIT

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-postgresql-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-postgresql-security"><img src="https://eslint.interlace.tools/images/og-postgresql-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>
