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

Structured JSON with abbreviated keys for programmatic consumption. **`summary` ships first** so a downstream Claude / GPT prompt-cache prefix matches stay valid as the per-rule list churns ([Anthropic prompt-caching guide](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) — up to 90 % input cost / 85 % latency reduction on cache hits):

```json
{
  "summary": { "errors": 3, "warnings": 3, "files": 3, "fixable": 1, "rules": 2 },
  "rules": [
    {
      "id": "@interlace/pg/no-unsafe-query",
      "sev": "error",
      "n": 3,
      "fix": false,
      "sugg": false,
      "msg": "SQL injection: query built via string concatenation",
      "cwe": "CWE-089",
      "cvss": 9.8,
      "desc": "Detect SQL injection via string concatenation",
      "locs": [
        { "f": "src/auth/login.ts", "l": 23, "c": 5, "t": "CallExpression" },
        { "f": "src/db/queries.ts", "l": 8, "c": 10, "t": "CallExpression" }
      ]
    }
  ]
}
```

### NDJSON (streaming for agent loops)

Newline-delimited JSON: one self-describing JSON object per line, summary line first. Streams without buffering, parses incrementally, and a partial output is still valid JSONL for the lines that completed. Set `ESLINT_FORMAT_MODE=ndjson` to opt in. Validated against the [`rtk-ai`](https://github.com/NotMyself/rtk-ai) pattern (~90 % token reduction on lint output).

```
{"kind":"summary","errors":3,"warnings":3,"files":3,"fixable":1,"rules":2}
{"kind":"rule","id":"@interlace/pg/no-unsafe-query","sev":"error","n":3,"fix":false,"sugg":false,"msg":"SQL injection","cwe":"CWE-089","cvss":9.8,"locs":[…]}
{"kind":"rule","id":"no-unused-vars","sev":"warning","n":3,"fix":true,"sugg":false,"locs":[…]}
```

## Severity-First Ordering

Rules render with **errors before warnings**, then by count desc within each tier, then by ruleId for determinism. This guarantees the most attention-worthy class of finding is at the top of every render — exploiting the "lost in the middle" effect rather than fighting it. A single critical security finding will not be buried under thousands of style warnings.

## Token / Cost Knob

Set `ESLINT_FORMAT_CHAR_BUDGET=N` to enforce a hard character ceiling. The formatter trims rules from the tail (lowest priority by severity-first sort, so warnings get cut before errors) until the output fits, then appends an explicit `[truncated N rule(s)]` notice. Rule of thumb: **1 token ≈ 4 chars** across the o200k_base / cl100k_base tokenizers, so a 32 k-token agent budget maps to roughly `ESLINT_FORMAT_CHAR_BUDGET=128000`.

## Auto-Detection

| Environment | Selected Mode |
|---|---|
| Terminal (TTY) | `human` |
| CI (`CI=true`) | `compact` |
| Piped output | `compact` |
| `ESLINT_FORMAT_MODE=human \| compact \| json \| ndjson` | explicit override |
| `ESLINT_FORMAT_CHAR_BUDGET=N` | trims output to ≤ N chars (severity-first survives first) |
| `NO_COLOR=1` | disables ANSI color in human mode |

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
- ESLint 10.x ✓
- Node.js ≥18

See the [ESLint Version Support Policy](../../docs/ESLINT_VERSION_SUPPORT.md) for the support matrix and how versions are added or removed.

## API

The package exports its internals for programmatic use:

```typescript
import {
  groupByRule,
  computeSummary,
  renderHuman,
  renderCompact,
  renderJSON,
  renderNDJSON,
} from '@interlace/eslint-formatter';

const grouped = groupByRule(eslintResults, context, 'compact'); // mode-aware MAX_LOCATIONS cap
const summary = computeSummary(eslintResults, grouped);
const output = renderNDJSON(grouped, summary); // or renderCompact / renderJSON / renderHuman
```

## Performance & Effectiveness

Continuously benchmarked under the [Cost / Effectiveness / Latency triad](../../benchmarks/README.md#the-three-measurement-aspects-vocabulary-contract). Latest run on the v1.1 ILB-Formatter suite (240 cells across 6 corpus shapes × 5 scales × 8 formats):

| Mode | Cost (vs `eslint-stylish`) | Signal score | Latency P50 mean |
|---|---:|---:|---:|
| `compact` | **−89.5 %** | 4.0 / 4 | 0.04 ms |
| `ndjson` | −66.7 % | 4.0 / 4 | 0.06 ms |
| `json` | −67.9 % | 4.0 / 4 | 0.06 ms |
| `human` | −62.3 % | 4.0 / 4 | 0.08 ms |

Three contracts gate every release:
- **Signal contract** — every structured format (`json`, `ndjson`) must score 4 / 4 on every fixture (`ruleId`, `severity`, `count`, `fixable` all machine-recoverable).
- **Latency contract** — `interlace-*` P50 ≤ {tiny:5, small:10, medium:25, large:50, extreme:250} ms per fixture scale.
- **Per-cell regression check** — every cell within +5 % tokens / max(+50 %, +0.5 ms) latency / signal score ≥ baseline vs the snapshotted `baseline.json`.

<!-- INTERLACE:STAR_CTA:START -->

## ⭐ Support & follow

If the Interlace ESLint ecosystem is useful to you, **[star the repo](https://github.com/ofri-peretz/eslint)** — stars are the signal that keeps it maintained — and **[follow the writeups on Dev.to](https://dev.to/ofri-peretz)** for the benchmarks and security research behind these rules.

[![GitHub stars](https://img.shields.io/github/stars/ofri-peretz/eslint?style=social)](https://github.com/ofri-peretz/eslint)

<!-- INTERLACE:STAR_CTA:END -->

## License

MIT © [Ofri Peretz](https://ofriperetz.dev/?utm_source=github&utm_medium=referral&utm_campaign=eslint-formatter)
