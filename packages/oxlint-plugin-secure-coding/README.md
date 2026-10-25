# oxlint-plugin-secure-coding

The `secure-coding` rules for [oxlint](https://oxc.rs/docs/guide/usage/linter) and
[Vite+](https://viteplus.dev). This package is the oxlint name for
[`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding): the same rules, the same
rule IDs (`secure-coding/<rule>`), and the same version. It contains no rule code of its own, and it
does not install ESLint.

## Install

```bash
npm install --save-dev oxlint-plugin-secure-coding
```

## Vite+

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: ['oxlint-plugin-secure-coding'],
    rules: {
      'secure-coding/<rule>': 'error',
    },
  },
});
```

## oxlint

```json
{
  "jsPlugins": ["oxlint-plugin-secure-coding"],
  "rules": {
    "secure-coding/<rule>": "error"
  }
}
```

## Rules

Every rule, its options and its docs are listed in the
[`eslint-plugin-secure-coding` README](https://www.npmjs.com/package/eslint-plugin-secure-coding#rules). Using ESLint
instead? Install `eslint-plugin-secure-coding` directly.

## License

MIT

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-secure-coding?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-secure-coding"><img src="https://eslint.interlace.tools/images/og-secure-coding.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>
