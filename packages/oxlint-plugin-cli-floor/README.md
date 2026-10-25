# oxlint-plugin-cli-floor

The `cli-floor` rules for [oxlint](https://oxc.rs/docs/guide/usage/linter) and
[Vite+](https://viteplus.dev). This package is the oxlint name for
[`eslint-plugin-cli-floor`](https://www.npmjs.com/package/eslint-plugin-cli-floor): the same rules, the same
rule IDs (`cli-floor/<rule>`), and the same version. It contains no rule code of its own, and it
does not install ESLint.

## Install

```bash
npm install --save-dev oxlint-plugin-cli-floor
```

## Vite+

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: ['oxlint-plugin-cli-floor'],
    rules: {
      'cli-floor/<rule>': 'error',
    },
  },
});
```

## oxlint

```json
{
  "jsPlugins": ["oxlint-plugin-cli-floor"],
  "rules": {
    "cli-floor/<rule>": "error"
  }
}
```

## Rules

Every rule, its options and its docs are listed in the
[`eslint-plugin-cli-floor` README](https://www.npmjs.com/package/eslint-plugin-cli-floor#rules). Using ESLint
instead? Install `eslint-plugin-cli-floor` directly.

## License

MIT

<p align="center">
  <a href="https://eslint.interlace.tools/docs/quality/plugin-cli-floor?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-cli-floor"><img src="https://eslint.interlace.tools/images/og-cli-floor.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>
