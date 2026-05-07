# Oxlint Integration — Interlace ESLint Monorepo

**Date:** 2026-05-03
**Status:** Experimental (alpha)

---

## Architecture: Two-Tier Lint Pipeline

The fastest feedback loop uses a **two-tier architecture**:

```
Tier 1 — oxlint (native Rust)     → 64ms   → correctness, perf, suspicious
Tier 2 — oxlint + JS plugins      → 805ms  → Interlace security rules (pg, secure-coding, etc.)
Tier 3 — ESLint (full)             → ~5-15s → type-aware rules, custom configs
```

### Why Two Tiers?

| Metric | oxlint (native) | oxlint + JS plugins | ESLint |
|---|---:|---:|---:|
| **567 files, 114-128 rules** | **64ms** | **805ms** | ~5,000ms+ |
| Relative speed | **1x** | **12.6x** | **~80x** |
| Custom Interlace rules | ❌ | ✅ | ✅ |
| Type-aware rules | ✅ (via tsgo) | ❌ (not yet) | ✅ |
| SDK-specific security | ❌ | ✅ | ✅ |

**Key finding:** JS plugins add ~741ms overhead (Node.js startup + module loading),
but still deliver **6-20x faster** feedback than ESLint for the same rule set.

## Setup

### Files

```
.oxlintrc.json                          ← Production: native rules only (64ms)
.oxlintrc.experimental.json             ← Experimental: native + Interlace JS plugins (805ms)
tools/oxlint-plugins/interlace-pg.cjs   ← Shim for workspace module resolution
```

### npm Scripts

```bash
npm run oxlint              # Tier 1: native only (64ms)
npm run oxlint:interlace    # Tier 2: native + Interlace (805ms)
npm run quality             # Full pipeline: oxlint → tests → markdownlint
```

### How the Shim Works

Nx workspace packages use TypeScript source with symlinks in node_modules.
Oxlint's JS plugin API loads plugins via Node.js `require()` which needs
compiled `.js` files. The shim patches module resolution to load from `dist/`:

```
oxlint → loads ./tools/oxlint-plugins/interlace-pg.cjs
         → patches require('@interlace/eslint-devkit') → dist/packages/eslint-devkit/
         → loads dist/packages/eslint-plugin-pg/
```

**Prerequisite:** `npx nx build eslint-plugin-pg` must run before `oxlint:interlace`.

## Oxlint JS Plugin API Compatibility

### What Works

- ✅ AST traversal and `create(context)` pattern
- ✅ `context.report()` with message and node
- ✅ `context.sourceCode.getText(node)`
- ✅ Rule options
- ✅ Selectors (ESLint v9 API)
- ✅ Scope analysis
- ✅ Fixes and suggestions

### What Doesn't Work Yet

- ❌ Type-aware rules (`context.sourceCode.getType()`) — blocked on tsgo integration for JS plugins
- ❌ Custom parsers (e.g., Vue SFC)

### Impact on Interlace Rules

| Plugin | JS Plugin Compatible | Blockers |
|---|---|---|
| `eslint-plugin-pg` | ✅ Yes | None — pure AST pattern matching |
| `eslint-plugin-secure-coding` | ✅ Yes | None |
| `eslint-plugin-node-security` | ✅ Yes | None |
| `eslint-plugin-express-security` | ✅ Yes | None |
| `eslint-plugin-import-next` | ⚠️ Partial | Uses `oxc-resolver` (native) — should work |
| `eslint-plugin-jwt` | ⚠️ Untested | Uses `@typescript-eslint/utils` |
| `eslint-plugin-conventions` | ⚠️ Untested | Some rules may need type info |

## Recommended CI Pipeline

```yaml
# .github/workflows/lint.yml
jobs:
  lint:
    steps:
      # Tier 1: Fast feedback (< 1s)
      - run: npm run oxlint

      # Tier 2: Interlace security rules (< 2s)
      - run: npx nx build eslint-plugin-pg
      - run: npm run oxlint:interlace

      # Tier 3: Full ESLint (type-aware, only if needed)
      # - run: npx eslint --cache src/
```

## Adding More Interlace Plugins

1. Create a shim in `tools/oxlint-plugins/`:

```javascript
// tools/oxlint-plugins/interlace-secure-coding.cjs
const path = require('path');
const Module = require('module');
const distPath = path.join(__dirname, '../../dist/packages');
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function(request, parent, isMain, options) {
  if (request === '@interlace/eslint-devkit') return path.join(distPath, 'eslint-devkit/src/index.js');
  if (request === '@interlace/eslint-devkit/resolver') return path.join(distPath, 'eslint-devkit/src/resolver.js');
  return originalResolve.apply(this, arguments);
};
module.exports = require(path.join(distPath, 'eslint-plugin-secure-coding/src/index.js'));
```

2. Add to `.oxlintrc.experimental.json`:

```json
{
  "jsPlugins": [
    { "name": "interlace-secure-coding", "specifier": "./tools/oxlint-plugins/interlace-secure-coding.cjs" }
  ],
  "rules": {
    "interlace-secure-coding/no-eval": "error"
  }
}
```

## Future: Eliminating the Shim

When oxlint adds support for workspace-aware module resolution (tracking
issue TBD), the shim layer becomes unnecessary. At that point:

```json
{
  "jsPlugins": ["eslint-plugin-pg"],
  "rules": { "pg/no-unsafe-query": "error" }
}
```

## Future: Native Oxlint Rules

The ultimate performance target is to contribute Interlace's highest-impact
rules as **native Rust implementations** in oxlint. This would bring them
from 805ms → 64ms tier. Candidates:

1. `no-unsafe-query` (CWE-89) — highest impact, pure AST
2. `no-hardcoded-credentials` (CWE-798) — common across all SDKs
3. `no-eval` — already partially covered by native oxlint
