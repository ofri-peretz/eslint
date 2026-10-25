# oxlint-plugin-conventions

The `conventions` rules for [oxlint](https://oxc.rs/docs/guide/usage/linter) and
[Vite+](https://viteplus.dev). This package is the oxlint name for
[`eslint-plugin-conventions`](https://www.npmjs.com/package/eslint-plugin-conventions): the same rules, the same
rule IDs (`conventions/<rule>`), and the same version. It contains no rule code of its own, and it
does not install ESLint.

## Install

```bash
npm install --save-dev oxlint-plugin-conventions
```

## Vite+

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: ['oxlint-plugin-conventions'],
    rules: {
      'conventions/<rule>': 'error',
    },
  },
});
```

## oxlint

```json
{
  "jsPlugins": ["oxlint-plugin-conventions"],
  "rules": {
    "conventions/<rule>": "error"
  }
}
```

## Rules

Every rule, its options and its docs are listed in the
[`eslint-plugin-conventions` README](https://www.npmjs.com/package/eslint-plugin-conventions#rules). Using ESLint
instead? Install `eslint-plugin-conventions` directly.

## License

MIT

<p align="center">
  <a href="https://eslint.interlace.tools/docs/quality/plugin-conventions?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-conventions"><img src="https://eslint.interlace.tools/images/og-conventions.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>
