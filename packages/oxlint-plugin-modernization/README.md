# oxlint-plugin-modernization

The `modernization` rules for [oxlint](https://oxc.rs/docs/guide/usage/linter) and
[Vite+](https://viteplus.dev). This package is the oxlint name for
[`eslint-plugin-modernization`](https://www.npmjs.com/package/eslint-plugin-modernization): the same rules, the same
rule IDs (`modernization/<rule>`), and the same version. It contains no rule code of its own, and it
does not install ESLint.

## Install

```bash
npm install --save-dev oxlint-plugin-modernization
```

## Vite+

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: ['oxlint-plugin-modernization'],
    rules: {
      'modernization/<rule>': 'error',
    },
  },
});
```

## oxlint

```json
{
  "jsPlugins": ["oxlint-plugin-modernization"],
  "rules": {
    "modernization/<rule>": "error"
  }
}
```

## Rules

Every rule, its options and its docs are listed in the
[`eslint-plugin-modernization` README](https://www.npmjs.com/package/eslint-plugin-modernization#rules). Using ESLint
instead? Install `eslint-plugin-modernization` directly.

## License

MIT

<p align="center">
  <a href="https://eslint.interlace.tools/docs/quality/plugin-modernization?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-modernization"><img src="https://eslint.interlace.tools/images/og-modernization.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>
