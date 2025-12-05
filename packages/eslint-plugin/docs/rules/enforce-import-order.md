# Enforce Import Order (`architecture/enforce-import-order`)

💼 This rule is enabled in the following configs: `recommended`, `strict`, `architecture`.

🔧 This rule is automatically fixable by the `--fix` CLI option.

Enforces a specific order for import statements. This rule helps keep codebases consistent and makes it easier to find imports. It is a modern, AI-friendly alternative to `eslint-plugin-import/order` and `simple-import-sort`.

## Rule Details

This rule sorts imports into groups (e.g., built-in, external, internal) and then alphabetizes them within each group. It also enforces newlines between groups.

### Default Configuration

```json
{
  "rules": {
    "@forge-js/llm-optimized/architecture/enforce-import-order": ["error", {
      "groups": ["builtin", "external", "internal", "parent", "sibling", "index", "side-effect"],
      "internalPatterns": ["^@/"],
      "alphabetize": {
        "order": "asc",
        "caseInsensitive": true
      },
      "newlinesBetween": "always"
    }]
  }
}
```

## Options

### `groups`

An array of strings defining the order of import groups.

- `builtin`: Node.js built-in modules (e.g., `fs`, `path`)
- `external`: npm packages (e.g., `react`, `lodash`)
- `internal`: Internal aliases matching `internalPatterns` (e.g., `@/components`)
- `parent`: Parent imports (e.g., `../utils`)
- `sibling`: Sibling imports (e.g., `./helper`)
- `index`: Index imports (e.g., `.`, `./index`)
- `side-effect`: Side-effect imports (e.g., `import './styles.css'`)
- `type`: Type imports (e.g., `import type { User } from './types'`) - *Note: Type imports are currently sorted based on their module source unless separated.*
- `object`: Object imports (e.g., `import log = console.log`) - *Note: Less common.*

### `internalPatterns`

An array of regex strings to identify internal modules. Useful for monorepos or webpack aliases.

Example: `["^@/", "^src/"]`

### `alphabetize`

Configuration for alphabetical sorting within groups.

- `order`: `"asc"` (ascending), `"desc"` (descending), or `"ignore"` (no sorting).
- `caseInsensitive`: boolean (default `true`).

### `newlinesBetween`

Enforces newlines between import groups.

- `"always"`: Require at least one newline between groups.
- `"never"`: Disallow newlines between groups.
- `"ignore"`: Do not enforce newline usage.

## Examples

### ❌ Incorrect

```typescript
import { helper } from './helper';
import fs from 'fs';
import React from 'react';
```

### ✅ Correct

```typescript
import fs from 'fs';

import React from 'react';

import { helper } from './helper';
```

## Why use this over `eslint-plugin-import`?

1.  **Performance**: Faster implementation using simplified AST traversal.
2.  **AI-Optimized**: Error messages include structured fix instructions that LLMs can easily interpret.
3.  **Zero Config Defaults**: Sensible defaults that work for most modern TypeScript/React projects out of the box.
4.  **Integrated**: Part of the `@forge-js/eslint-plugin-llm-optimized` ecosystem, reducing dependency bloat.

## Related Rules

- `no-duplicates`
- `first`
- `newline-after-import`
