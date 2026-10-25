# oxlint-plugin-reliability

The `reliability` rules for [oxlint](https://oxc.rs/docs/guide/usage/linter) and
[Vite+](https://viteplus.dev). This package is the oxlint name for
[`eslint-plugin-reliability`](https://www.npmjs.com/package/eslint-plugin-reliability): the same rules, the same
rule IDs (`reliability/<rule>`), and the same version. It contains no rule code of its own, and it
does not install ESLint.

## Install

```bash
npm install --save-dev oxlint-plugin-reliability
```

## Vite+

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: ['oxlint-plugin-reliability'],
    rules: {
      'reliability/<rule>': 'error',
    },
  },
});
```

## oxlint

```json
{
  "jsPlugins": ["oxlint-plugin-reliability"],
  "rules": {
    "reliability/<rule>": "error"
  }
}
```

## Rules

Every rule, its options and its docs are listed in the
[`eslint-plugin-reliability` README](https://www.npmjs.com/package/eslint-plugin-reliability#rules). Using ESLint
instead? Install `eslint-plugin-reliability` directly.

## License

MIT

<p align="center">
  <a href="https://eslint.interlace.tools/docs/quality/plugin-reliability?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-reliability"><img src="https://eslint.interlace.tools/images/og-reliability.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>
