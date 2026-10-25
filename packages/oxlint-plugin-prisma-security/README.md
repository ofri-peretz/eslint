# oxlint-plugin-prisma-security

The `prisma-security` rules for [oxlint](https://oxc.rs/docs/guide/usage/linter) and
[Vite+](https://viteplus.dev). This package is the oxlint name for
[`eslint-plugin-prisma-security`](https://www.npmjs.com/package/eslint-plugin-prisma-security): the same rules, the same
rule IDs (`prisma-security/<rule>`), and the same version. It contains no rule code of its own, and it
does not install ESLint.

## Install

```bash
npm install --save-dev oxlint-plugin-prisma-security
```

## Vite+

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: ['oxlint-plugin-prisma-security'],
    rules: {
      'prisma-security/<rule>': 'error',
    },
  },
});
```

## oxlint

```json
{
  "jsPlugins": ["oxlint-plugin-prisma-security"],
  "rules": {
    "prisma-security/<rule>": "error"
  }
}
```

## Rules

Every rule, its options and its docs are listed in the
[`eslint-plugin-prisma-security` README](https://www.npmjs.com/package/eslint-plugin-prisma-security#rules). Using ESLint
instead? Install `eslint-plugin-prisma-security` directly.

## License

MIT

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-prisma-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-prisma-security"><img src="https://eslint.interlace.tools/images/og-prisma-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>
