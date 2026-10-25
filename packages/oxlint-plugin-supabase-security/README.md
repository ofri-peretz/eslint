# oxlint-plugin-supabase-security

The `supabase-security` rules for [oxlint](https://oxc.rs/docs/guide/usage/linter) and
[Vite+](https://viteplus.dev). This package is the oxlint name for
[`eslint-plugin-supabase-security`](https://www.npmjs.com/package/eslint-plugin-supabase-security): the same rules, the same
rule IDs (`supabase-security/<rule>`), and the same version. It contains no rule code of its own, and it
does not install ESLint.

## Install

```bash
npm install --save-dev oxlint-plugin-supabase-security
```

## Vite+

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: ['oxlint-plugin-supabase-security'],
    rules: {
      'supabase-security/<rule>': 'error',
    },
  },
});
```

## oxlint

```json
{
  "jsPlugins": ["oxlint-plugin-supabase-security"],
  "rules": {
    "supabase-security/<rule>": "error"
  }
}
```

## Rules

Every rule, its options and its docs are listed in the
[`eslint-plugin-supabase-security` README](https://www.npmjs.com/package/eslint-plugin-supabase-security#rules). Using ESLint
instead? Install `eslint-plugin-supabase-security` directly.

## License

MIT

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-supabase-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-supabase-security"><img src="https://eslint.interlace.tools/images/og-supabase-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>
