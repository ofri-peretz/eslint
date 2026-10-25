# oxlint-plugin-lambda-security

The `lambda-security` rules for [oxlint](https://oxc.rs/docs/guide/usage/linter) and
[Vite+](https://viteplus.dev). This package is the oxlint name for
[`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security): the same rules, the same
rule IDs (`lambda-security/<rule>`), and the same version. It contains no rule code of its own, and it
does not install ESLint.

## Install

```bash
npm install --save-dev oxlint-plugin-lambda-security
```

## Vite+

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: ['oxlint-plugin-lambda-security'],
    rules: {
      'lambda-security/<rule>': 'error',
    },
  },
});
```

## oxlint

```json
{
  "jsPlugins": ["oxlint-plugin-lambda-security"],
  "rules": {
    "lambda-security/<rule>": "error"
  }
}
```

## Rules

Every rule, its options and its docs are listed in the
[`eslint-plugin-lambda-security` README](https://www.npmjs.com/package/eslint-plugin-lambda-security#rules). Using ESLint
instead? Install `eslint-plugin-lambda-security` directly.

## License

MIT

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-lambda-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-lambda-security"><img src="https://eslint.interlace.tools/images/og-lambda-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>
