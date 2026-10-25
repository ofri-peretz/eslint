# oxlint-plugin-maintainability

The `maintainability` rules for [oxlint](https://oxc.rs/docs/guide/usage/linter) and
[Vite+](https://viteplus.dev). This package is the oxlint name for
[`eslint-plugin-maintainability`](https://www.npmjs.com/package/eslint-plugin-maintainability): the same rules, the same
rule IDs (`maintainability/<rule>`), and the same version. It contains no rule code of its own, and it
does not install ESLint.

## Install

```bash
npm install --save-dev oxlint-plugin-maintainability
```

## Vite+

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: ['oxlint-plugin-maintainability'],
    rules: {
      'maintainability/<rule>': 'error',
    },
  },
});
```

## oxlint

```json
{
  "jsPlugins": ["oxlint-plugin-maintainability"],
  "rules": {
    "maintainability/<rule>": "error"
  }
}
```

## Rules

Every rule, its options and its docs are listed in the
[`eslint-plugin-maintainability` README](https://www.npmjs.com/package/eslint-plugin-maintainability#rules). Using ESLint
instead? Install `eslint-plugin-maintainability` directly.

## License

MIT

<p align="center">
  <a href="https://eslint.interlace.tools/docs/quality/plugin-maintainability?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-maintainability"><img src="https://eslint.interlace.tools/images/og-maintainability.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>
