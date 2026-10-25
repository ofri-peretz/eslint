# oxlint-plugin-react-features

The `react-features` rules for [oxlint](https://oxc.rs/docs/guide/usage/linter) and
[Vite+](https://viteplus.dev). This package is the oxlint name for
[`eslint-plugin-react-features`](https://www.npmjs.com/package/eslint-plugin-react-features): the same rules, the same
rule IDs (`react-features/<rule>`), and the same version. It contains no rule code of its own, and it
does not install ESLint.

## Install

```bash
npm install --save-dev oxlint-plugin-react-features
```

## Vite+

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: ['oxlint-plugin-react-features'],
    rules: {
      'react-features/<rule>': 'error',
    },
  },
});
```

## oxlint

```json
{
  "jsPlugins": ["oxlint-plugin-react-features"],
  "rules": {
    "react-features/<rule>": "error"
  }
}
```

## Rules

Every rule, its options and its docs are listed in the
[`eslint-plugin-react-features` README](https://www.npmjs.com/package/eslint-plugin-react-features#rules). Using ESLint
instead? Install `eslint-plugin-react-features` directly.

## License

MIT

<p align="center">
  <a href="https://eslint.interlace.tools/docs/quality/plugin-react-features?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-react-features"><img src="https://eslint.interlace.tools/images/og-react-features.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>
