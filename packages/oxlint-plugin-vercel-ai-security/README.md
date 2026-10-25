# oxlint-plugin-vercel-ai-security

The `vercel-ai-security` rules for [oxlint](https://oxc.rs/docs/guide/usage/linter) and
[Vite+](https://viteplus.dev). This package is the oxlint name for
[`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security): the same rules, the same
rule IDs (`vercel-ai-security/<rule>`), and the same version. It contains no rule code of its own, and it
does not install ESLint.

## Install

```bash
npm install --save-dev oxlint-plugin-vercel-ai-security
```

## Vite+

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: ['oxlint-plugin-vercel-ai-security'],
    rules: {
      'vercel-ai-security/<rule>': 'error',
    },
  },
});
```

## oxlint

```json
{
  "jsPlugins": ["oxlint-plugin-vercel-ai-security"],
  "rules": {
    "vercel-ai-security/<rule>": "error"
  }
}
```

## Rules

Every rule, its options and its docs are listed in the
[`eslint-plugin-vercel-ai-security` README](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security#rules). Using ESLint
instead? Install `eslint-plugin-vercel-ai-security` directly.

## License

MIT

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-vercel-ai-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-vercel-ai-security"><img src="https://eslint.interlace.tools/images/og-vercel-ai-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>
