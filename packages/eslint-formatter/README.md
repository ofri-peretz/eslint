# @interlace/eslint-formatter

Smart ESLint formatter that groups errors by rule and supports multiple output modes.

Instead of repeating the same violation across 50 files, this formatter emits each rule **once** with a count and representative locations — dramatically reducing output size.

## Installation

```bash
npm install -D @interlace/eslint-formatter
```

## Usage

```bash
# Use as ESLint formatter
eslint -f @interlace/eslint-formatter src/

# Force a specific mode
ESLINT_FORMAT_MODE=json eslint -f @interlace/eslint-formatter src/
```

## Output Modes

### Human (default in terminals)

Rich, grouped output with icons, descriptions, and file locations:

```
  ✖ @interlace/pg/no-unsafe-query ×3 — error
    Detect SQL injection via string concatenation
    src/auth/login.ts:23:5
    src/db/queries.ts:8:10
    src/db/queries.ts:41:10

  ⚠ no-unused-vars ×3 — warning (fixable)
    Disallow unused variables
    src/auth/login.ts:5:7
    src/auth/login.ts:12:3
    src/utils/helpers.ts:1:1

────────────────────────────────────────────────────────
  3 errors, 3 warnings across 3 files (2 rules)
  1 fixable with --fix
```

### Compact (default in CI and piped output)

One line per rule — optimized for token efficiency:

```
ERR @interlace/pg/no-unsafe-query ×3 — Detect SQL injection via string concatenation @ src/auth/login.ts:23, src/db/queries.ts:8, src/db/queries.ts:41
WARN no-unused-vars ×3 [fixable] — Disallow unused variables @ src/auth/login.ts:5, src/auth/login.ts:12, src/utils/helpers.ts:1
3E 3W 3 files 2 rules 1 fixable
```

### JSON (for tooling and agents)

Structured JSON with abbreviated keys for programmatic consumption:

```json
{
  "rules": [
    {
      "id": "@interlace/pg/no-unsafe-query",
      "sev": "error",
      "n": 3,
      "fix": false,
      "desc": "Detect SQL injection via string concatenation",
      "locs": [
        { "f": "src/auth/login.ts", "l": 23, "c": 5 },
        { "f": "src/db/queries.ts", "l": 8, "c": 10 }
      ]
    }
  ],
  "summary": { "errors": 3, "warnings": 3, "files": 3, "fixable": 1, "rules": 2 }
}
```

## Auto-Detection

| Environment | Selected Mode |
|---|---|
| Terminal (TTY) | `human` |
| CI (`CI=true`) | `compact` |
| Piped output | `compact` |
| `ESLINT_FORMAT_MODE=json` | `json` |

## Why Group by Rule?

Traditional formatters repeat the same message for every file:

```
src/a.ts:5:1  error  SQL injection  @interlace/pg/no-unsafe-query
src/b.ts:8:1  error  SQL injection  @interlace/pg/no-unsafe-query
src/c.ts:3:1  error  SQL injection  @interlace/pg/no-unsafe-query
... (50 more identical lines)
```

This formatter groups them:

```
ERR @interlace/pg/no-unsafe-query ×53 @ src/a.ts:5, src/b.ts:8, src/c.ts:3 +50 more
```

At 20 files × 2 rules, compact grouped output is **<30% the size** of the default ESLint stylish formatter.

## Compatibility

- ESLint 8.x ✓
- ESLint 9.x ✓
- Node.js ≥18

## API

The package exports its internals for programmatic use:

```typescript
import { groupByRule, computeSummary, renderHuman, renderCompact, renderJSON } from '@interlace/eslint-formatter';

const grouped = groupByRule(eslintResults, context);
const summary = computeSummary(eslintResults, grouped);
const output = renderCompact(grouped, summary);
```

## License

MIT © [Ofri Peretz](https://ofriperetz.dev)
