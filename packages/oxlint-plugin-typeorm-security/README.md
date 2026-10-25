# oxlint-plugin-typeorm-security

The `typeorm-security` rules for [oxlint](https://oxc.rs/docs/guide/usage/linter) and
[Vite+](https://viteplus.dev). This package is the oxlint name for
[`eslint-plugin-typeorm-security`](https://www.npmjs.com/package/eslint-plugin-typeorm-security): the same rules, the same
rule IDs (`typeorm-security/<rule>`), and the same version. It contains no rule code of its own, and it
does not install ESLint.

## Install

```bash
npm install --save-dev oxlint-plugin-typeorm-security
```

## Vite+

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: ['oxlint-plugin-typeorm-security'],
    rules: {
      'typeorm-security/<rule>': 'error',
    },
  },
});
```

## oxlint

```json
{
  "jsPlugins": ["oxlint-plugin-typeorm-security"],
  "rules": {
    "typeorm-security/<rule>": "error"
  }
}
```

## Rules

Every rule, its options and its docs are listed in the
[`eslint-plugin-typeorm-security` README](https://www.npmjs.com/package/eslint-plugin-typeorm-security#rules). Using ESLint
instead? Install `eslint-plugin-typeorm-security` directly.

## License

MIT

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-typeorm-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-typeorm-security"><img src="https://eslint.interlace.tools/images/og-typeorm-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>
