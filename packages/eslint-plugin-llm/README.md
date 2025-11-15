# eslint-plugin-llm

**ESLint rules optimized for Large Language Models.**

[![npm version](https://img.shields.io/npm/v/eslint-plugin-llm.svg)](https://www.npmjs.com/package/eslint-plugin-llm)
[![npm downloads](https://img.shields.io/npm/dm/eslint-plugin-llm.svg)](https://www.npmjs.com/package/eslint-plugin-llm)

This package is a barrel export that re-exports everything from `@forge-js/eslint-plugin-llm-optimized`. It provides ESLint rules with error messages optimized for both human developers and Large Language Models. Each rule is designed to be auto-fixable and includes structured context that enables AI assistants to understand the violation and apply consistent fixes.

**Core principle:** Every error message should teach, not just warn.

---

## Why This Package?

This package provides a shorter, more discoverable name for developers looking for LLM-optimized ESLint rules. It's functionally identical to `@forge-js/eslint-plugin-llm-optimized` and `eslint-plugin-llm-optimized`.

---

## Installation

```bash
npm install --save-dev eslint-plugin-llm
# or
pnpm add -D eslint-plugin-llm
# or
yarn add -D eslint-plugin-llm
```

**Note:** For TypeScript projects, also install `typescript-eslint`:

```bash
npm install --save-dev typescript-eslint
```

---

## Configuration

### Flat Config (eslint.config.js) - Recommended

```javascript
import llm from 'eslint-plugin-llm';
import js from '@eslint/js';

export default [js.configs.recommended, llm.configs.recommended];
```

### With TypeScript

```javascript
import llm from 'eslint-plugin-llm';
import tseslint from 'typescript-eslint';

export default [
  ...tseslint.configs.recommended,
  llm.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'llm/database-injection': 'error',
    },
  },
];
```

---

## Related Packages

- **`eslint-plugin-llm-optimized`** - Descriptive version of this package
- **`eslint-plugin-mcp`** - MCP-focused variant
- **`eslint-plugin-mcp-optimized`** - MCP-optimized variant
- **`@forge-js/eslint-plugin-llm-optimized`** - Original scoped package
- **[@forge-js/eslint-plugin-utils](https://www.npmjs.com/package/@forge-js/eslint-plugin-utils)** - Build your own LLM-optimized rules

---

## For More Information

See the full documentation at [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized) for:
- Complete rule list
- Configuration options
- Integration guides
- Best practices

---

## 📦 Package Transparency

> **Note:** This package is a barrel export of `@forge-js/eslint-plugin-llm-optimized`. It provides an alternative package name for discoverability purposes as part of an A/B testing strategy.

**Why multiple package names?**

This package, along with `eslint-plugin-llm-optimized`, `eslint-plugin-mcp`, and `eslint-plugin-mcp-optimized`, are all functionally identical barrel exports of the same underlying package (`@forge-js/eslint-plugin-llm-optimized`). They exist to test which package names are most discoverable and resonate with developers.

**All packages:**
- Provide the exact same functionality
- Are maintained and updated together
- Re-export from the same source package
- Can be used interchangeably

You can use whichever package name you prefer - they all work the same way!

---

## License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

