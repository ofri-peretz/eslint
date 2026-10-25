# oxlint-plugin-operability

The `operability` rules for [oxlint](https://oxc.rs/docs/guide/usage/linter) and
[Vite+](https://viteplus.dev). This package is the oxlint name for
[`eslint-plugin-operability`](https://www.npmjs.com/package/eslint-plugin-operability): the same rules, the same
rule IDs (`operability/<rule>`), and the same version. It contains no rule code of its own, and it
does not install ESLint.

## Install

```bash
npm install --save-dev oxlint-plugin-operability
```

## Vite+

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: ['oxlint-plugin-operability'],
    rules: {
      'operability/<rule>': 'error',
    },
  },
});
```

## oxlint

```json
{
  "jsPlugins": ["oxlint-plugin-operability"],
  "rules": {
    "operability/<rule>": "error"
  }
}
```

## Rules

Every rule, its options and its docs are listed in the
[`eslint-plugin-operability` README](https://www.npmjs.com/package/eslint-plugin-operability#rules). Using ESLint
instead? Install `eslint-plugin-operability` directly.

## License

MIT

<p align="center">
  <a href="https://eslint.interlace.tools/docs/quality/plugin-operability?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-operability"><img src="https://eslint.interlace.tools/images/og-operability.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>
