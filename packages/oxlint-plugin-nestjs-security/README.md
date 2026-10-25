# oxlint-plugin-nestjs-security

The `nestjs-security` rules for [oxlint](https://oxc.rs/docs/guide/usage/linter) and
[Vite+](https://viteplus.dev). This package is the oxlint name for
[`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security): the same rules, the same
rule IDs (`nestjs-security/<rule>`), and the same version. It contains no rule code of its own, and it
does not install ESLint.

## Install

```bash
npm install --save-dev oxlint-plugin-nestjs-security
```

## Vite+

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: ['oxlint-plugin-nestjs-security'],
    rules: {
      'nestjs-security/<rule>': 'error',
    },
  },
});
```

## oxlint

```json
{
  "jsPlugins": ["oxlint-plugin-nestjs-security"],
  "rules": {
    "nestjs-security/<rule>": "error"
  }
}
```

## Rules

Every rule, its options and its docs are listed in the
[`eslint-plugin-nestjs-security` README](https://www.npmjs.com/package/eslint-plugin-nestjs-security#rules). Using ESLint
instead? Install `eslint-plugin-nestjs-security` directly.

## License

MIT

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-nestjs-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-nestjs-security"><img src="https://eslint.interlace.tools/images/og-nestjs-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>
