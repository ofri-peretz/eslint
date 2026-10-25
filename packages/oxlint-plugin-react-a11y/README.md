# oxlint-plugin-react-a11y

The `react-a11y` rules for [oxlint](https://oxc.rs/docs/guide/usage/linter) and
[Vite+](https://viteplus.dev). This package is the oxlint name for
[`eslint-plugin-react-a11y`](https://www.npmjs.com/package/eslint-plugin-react-a11y): the same rules, the same
rule IDs (`react-a11y/<rule>`), and the same version. It contains no rule code of its own, and it
does not install ESLint.

## Install

```bash
npm install --save-dev oxlint-plugin-react-a11y
```

## Vite+

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: ['oxlint-plugin-react-a11y'],
    rules: {
      'react-a11y/<rule>': 'error',
    },
  },
});
```

## oxlint

```json
{
  "jsPlugins": ["oxlint-plugin-react-a11y"],
  "rules": {
    "react-a11y/<rule>": "error"
  }
}
```

## Rules

Every rule, its options and its docs are listed in the
[`eslint-plugin-react-a11y` README](https://www.npmjs.com/package/eslint-plugin-react-a11y#rules). Using ESLint
instead? Install `eslint-plugin-react-a11y` directly.

## License

MIT

<p align="center">
  <a href="https://eslint.interlace.tools/docs/quality/plugin-react-a11y?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-react-a11y"><img src="https://eslint.interlace.tools/images/og-react-a11y.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>
