# oxlint-plugin-modularity

The `modularity` rules for [oxlint](https://oxc.rs/docs/guide/usage/linter) and
[Vite+](https://viteplus.dev). This package is the oxlint name for
[`eslint-plugin-modularity`](https://www.npmjs.com/package/eslint-plugin-modularity): the same rules, the same
rule IDs (`modularity/<rule>`), and the same version. It contains no rule code of its own, and it
does not install ESLint.

## Install

```bash
npm install --save-dev oxlint-plugin-modularity
```

## Vite+

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: ['oxlint-plugin-modularity'],
    rules: {
      'modularity/<rule>': 'error',
    },
  },
});
```

## oxlint

```json
{
  "jsPlugins": ["oxlint-plugin-modularity"],
  "rules": {
    "modularity/<rule>": "error"
  }
}
```

## Rules

Every rule, its options and its docs are listed in the
[`eslint-plugin-modularity` README](https://www.npmjs.com/package/eslint-plugin-modularity#rules). Using ESLint
instead? Install `eslint-plugin-modularity` directly.

## License

MIT

<p align="center">
  <a href="https://eslint.interlace.tools/docs/quality/plugin-modularity?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-modularity"><img src="https://eslint.interlace.tools/images/og-modularity.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>
