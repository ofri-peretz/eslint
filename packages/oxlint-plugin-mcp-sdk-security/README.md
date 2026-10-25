# oxlint-plugin-mcp-sdk-security

The `mcp-sdk-security` rules for [oxlint](https://oxc.rs/docs/guide/usage/linter) and
[Vite+](https://viteplus.dev). This package is the oxlint name for
[`eslint-plugin-mcp-sdk-security`](https://www.npmjs.com/package/eslint-plugin-mcp-sdk-security): the same rules, the same
rule IDs (`mcp-sdk-security/<rule>`), and the same version. It contains no rule code of its own, and it
does not install ESLint.

## Install

```bash
npm install --save-dev oxlint-plugin-mcp-sdk-security
```

## Vite+

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    jsPlugins: ['oxlint-plugin-mcp-sdk-security'],
    rules: {
      'mcp-sdk-security/<rule>': 'error',
    },
  },
});
```

## oxlint

```json
{
  "jsPlugins": ["oxlint-plugin-mcp-sdk-security"],
  "rules": {
    "mcp-sdk-security/<rule>": "error"
  }
}
```

## Rules

Every rule, its options and its docs are listed in the
[`eslint-plugin-mcp-sdk-security` README](https://www.npmjs.com/package/eslint-plugin-mcp-sdk-security#rules). Using ESLint
instead? Install `eslint-plugin-mcp-sdk-security` directly.

## License

MIT

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-mcp-sdk-security?utm_source=github&utm_medium=referral&utm_campaign=oxlint-plugin-mcp-sdk-security"><img src="https://eslint.interlace.tools/images/og-mcp-sdk-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>
