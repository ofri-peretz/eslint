# oxlint-plugin-drizzle-security

The `drizzle-security` rules for [oxlint](https://oxc.rs/docs/guide/usage/linter) and
[Vite+](https://viteplus.dev). This package is the oxlint name for
[`eslint-plugin-drizzle-security`](https://www.npmjs.com/package/eslint-plugin-drizzle-security): the same rules, the same
rule IDs (`drizzle-security/<rule>`), and the same version. It contains no rule code of its own, and it
does not install ESLint.

## Install

```bash
npm install --save-dev oxlint-plugin-drizzle-security
```

## Vite+

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: ['oxlint-plugin-drizzle-security'],
    rules: {
      'drizzle-security/<rule>': 'error',
    },
  },
});
```

## oxlint

```json
{
  "jsPlugins": ["oxlint-plugin-drizzle-security"],
  "rules": {
    "drizzle-security/<rule>": "error"
  }
}
```

## Rules

Every rule, its options and its docs are listed in the
[`eslint-plugin-drizzle-security` README](https://www.npmjs.com/package/eslint-plugin-drizzle-security#rules). Using ESLint
instead? Install `eslint-plugin-drizzle-security` directly.

## License

MIT

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-drizzle-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-drizzle-security"><img src="https://eslint.interlace.tools/images/og-drizzle-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>
