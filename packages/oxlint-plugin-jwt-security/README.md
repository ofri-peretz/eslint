# oxlint-plugin-jwt-security

The `jwt-security` rules for [oxlint](https://oxc.rs/docs/guide/usage/linter) and
[Vite+](https://viteplus.dev). This package is the oxlint name for
[`eslint-plugin-jwt-security`](https://www.npmjs.com/package/eslint-plugin-jwt-security): the same rules, the same
rule IDs (`jwt-security/<rule>`), and the same version. It contains no rule code of its own, and it
does not install ESLint.

## Install

```bash
npm install --save-dev oxlint-plugin-jwt-security
```

## Vite+

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: ['oxlint-plugin-jwt-security'],
    rules: {
      'jwt-security/<rule>': 'error',
    },
  },
});
```

## oxlint

```json
{
  "jsPlugins": ["oxlint-plugin-jwt-security"],
  "rules": {
    "jwt-security/<rule>": "error"
  }
}
```

## Rules

Every rule, its options and its docs are listed in the
[`eslint-plugin-jwt-security` README](https://www.npmjs.com/package/eslint-plugin-jwt-security#rules). Using ESLint
instead? Install `eslint-plugin-jwt-security` directly.

## License

MIT

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-jwt-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-jwt-security"><img src="https://eslint.interlace.tools/images/og-jwt-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>
