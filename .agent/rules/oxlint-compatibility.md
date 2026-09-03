# Oxlint Compatibility — Authoring Rules

> **Audience:** rule authors and reviewers.
> **Goal:** keep new rules oxlint-portable so they run at native speed via the JS-plugin tier.
> **Enforced by:** `npm run audit:portability:ci` and `npm run oxlint:shims:check` (both in `npm run quality`).

---

## Why this matters

Oxlint runs our JS plugins at **~12× ESLint speed** for the same rule set ([docs/oxlint-integration.md](../../docs/oxlint-integration.md)). Every rule that *can't* run on oxlint shrinks the addressable footprint of the fast tier.

Today: **397/397 rules (100%) are oxlint-compatible** and the CI gate locks this in.

---

## Verified support matrix (oxlint 1.62.0, source-cited)

The blocker list below is derived from reading oxlint's actual JS-plugin runtime, not heuristics. References point to files at `oxc-project/oxc@oxlint_v1.62.0`:

| Surface | Status | Source |
|---|---|---|
| `context.id`, `options`, `report`, `filename`, `physicalFilename`, `cwd`, `extend()` | ✅ full | `apps/oxlint/src-js/plugins/context.ts` |
| `context.languageOptions`, `settings` | ✅ full | `apps/oxlint/src-js/plugins/context.ts:415-432` |
| `context.sourceCode.{text,ast,getText,getAncestors,getLines,getLoc,getRange,getNodeByRangeIndex,...}` | ✅ full | `apps/oxlint/src-js/plugins/source_code.ts:183-356` |
| `context.sourceCode.getScope(node)` | ✅ full (uses `@typescript-eslint/scope-manager`) | `apps/oxlint/src-js/plugins/scope.ts:382` |
| `context.sourceCode.getDeclaredVariables(node)` | ✅ full | `apps/oxlint/src-js/plugins/scope.ts:368` |
| `context.sourceCode.markVariableAsUsed`, `isGlobalReference` | ✅ full | `apps/oxlint/src-js/plugins/scope.ts:334,420` |
| `context.sourceCode.{getCommentsBefore,getCommentsAfter,getCommentsInside,getJSDocComment,...}` | ✅ full | `apps/oxlint/src-js/plugins/source_code.ts:316-323` |
| `context.sourceCode.{getTokens,getTokenBefore,getTokenAfter,getTokensBetween,...}` | ✅ full | `apps/oxlint/src-js/plugins/source_code.ts:331-353` |
| `fixer.{replaceText,insertTextBefore,insertTextAfter,remove,replaceTextRange,...}` | ✅ full | `apps/oxlint/src-js/plugins/fix.ts:56-83` |
| `meta.fixable: 'code' \| 'whitespace'`, `meta.hasSuggestions`, `meta.schema` | ✅ full | `apps/oxlint/src-js/plugins/fix.ts:100-145` |
| esquery selectors (`'CallExpression[callee.name="foo"]'`, `:exit`, etc.) | ✅ full (same `esquery` library as ESLint) | `apps/oxlint/src-js/plugins/selector.ts:1-22` |
| `context.sourceCode.parserServices` | ⚠️ empty `Object.freeze({})` | `apps/oxlint/src-js/plugins/source_code.ts:230` |
| `getParserServices(context)` / `services.program.getTypeChecker()` | ❌ **only safe via `hasParserServices` guard** | (parserServices is empty; `getParserServices()` from `@typescript-eslint/utils` throws) |
| `services.esTreeNodeToTSNodeMap` | ❌ **only safe via `hasParserServices` guard** | (no type bridge in oxlint) |
| Custom parsers (Vue SFC, etc.) | ❌ not supported | (only the bundled parser) |

---

## Hard blocker list (the only things that crash on oxlint)

A rule is hard-blocked **only** if it executes one of these without a `hasParserServices(context)` guard:

1. `getParserServices(context)` / `program.getTypeChecker()` / `checker.getType*()` / `services.esTreeNodeToTSNodeMap` — parser services are empty on oxlint, so anything that depends on TypeScript type info crashes when called.
2. Custom parser registration (Vue SFC, etc.).

Everything else — scope analysis, fixers, suggestions, comments, tokens, selectors — is fully implemented in oxlint 1.62 and works identically.

### Required guard pattern for type-aware rules

```ts
import { hasParserServices, getParserServices } from '@interlace/eslint-devkit';

create(context) {
  if (!hasParserServices(context)) return {};        // soft no-op on oxlint
  const services = getParserServices(context);
  // ... type-aware logic
}
```

The 4 type-aware rules in the fleet (`import-next/{default,named,namespace}`, `secure-coding/detect-object-injection`) all use this pattern — they no-op on oxlint and run normally on ESLint when type info is available.

---

## Empirical verification

Source-reading is necessary but not sufficient. Three empirical checks back the support matrix:

1. **`npm run oxlint:verify-runtime`** loads [scripts/probe-oxlint-runtime.cjs](../../scripts/probe-oxlint-runtime.cjs) into the actually-installed oxlint and runs **33 probes**, one per API surface our rules depend on (`getScope`, `getDeclaredVariables`, every `fixer.*` method, every comment + token API, `parserServices` empty contract, etc.). If every probe fires, the runtime supports our entire contract — verified, not assumed. **This replaces the manual "go read the source" step when bumping oxlint.**
2. **[`benchmarks/suites/ilb-oxlint-parity`](../../benchmarks/suites/ilb-oxlint-parity)** runs the same fixtures through ESLint and oxlint+shims and diffs findings. Latest run: 100% parity across CWE corpus (27/27) and harvested RuleTester corpus (2630/2630, 0 divergent).
3. **`npm run oxlint:shims:check`** confirms every plugin's shim points at the live `<pkg>/dist/src/index.js` artifacts.

### When you bump oxlint

```bash
# 1. Bump the version in package.json + lockfile
npm install oxlint@<new-version>

# 2. Re-verify the runtime contract
npm run oxlint:verify-runtime
#  → if all 33 probes pass: runtime is compatible, proceed
#  → if any probe fails: re-read apps/oxlint/src-js/plugins/<broken-area>.ts
#    at the new tag, decide whether to refactor rules or downgrade

# 3. With probes green, auto-bump the pinned hashes
npm run oxlint:verify-runtime:update
git diff scripts/audit-rule-portability.ts   # review

# 4. Confirm gate is happy
npm run audit:portability:ci
```

The probe is also the first step of the GH `oxlint-parity` workflow on every PR — if a transitive dep change ever resurrects an oxlint version with a different JS-plugin API, the probe fails fast with a specific surface name.

---

## Authoring checklist

When writing a new rule:

1. **AST-only by default.** Use selectors, parent walks, scope APIs (they all work).
2. **Type-aware? Use the guard.** `if (!hasParserServices(context)) return {};` — see the 4 existing rules for the canonical pattern.
3. **Run `npm run audit:portability` locally** before opening a PR. Any blocker fails `npm run quality`.
4. **For new plugins:** the shim and subpath export are auto-generated. Run `npm run oxlint:shims` after creating `src/index.ts`.

---

## How the gate works

```
npm run quality
  ├── oxlint                           native rules
  ├── audit:portability:ci             ← blocker count must not increase
  ├── oxlint:shims:check               ← shim/manifest drift check
  ├── turbo run test
  └── ...
```

The portability gate uses [.agent/oxlint-portability-baseline.json](../oxlint-portability-baseline.json) as the lock; any new unguarded `getParserServices` / `esTreeNodeToTSNodeMap` use trips it.

---

## Rule aliasing

Four plugins double-register every rule under both a flat name and a categorized
name for `eslint-plugin-react`/`eslint-plugin-import` ecosystem compat:

| Plugin | Flat | Aliased | Naming scheme |
|---|---:|---:|---|
| `eslint-plugin-react-features` | 53 | 53 | `jsx-key` + `react/jsx-key` |
| `eslint-plugin-maintainability` | 12 | 12 | `<flat>` + `<category>/<flat>` |
| `eslint-plugin-reliability` | 9 | 9 | same |
| `eslint-plugin-operability` | 6 | 6 | same |

Both names point at the **same** rule object — registering them under categorized
namespaces just lets users opt into either flat-namespace or category-namespace
configs. `npm run oxlint:shims:verify` shows the breakdown:

```
✓ react-features    106 rule(s) (53 flat + 53 aliased)
```

The verify script asserts every aliased name has a flat counterpart — accidental
half-deletion (e.g. removing the `react/` prefix from a single rule) fails the
gate. If you add a new aliased plugin, expect `Object.keys(rules).length` to be
~2× the source-file count.

## See also

- [docs/oxlint-integration.md](../../docs/oxlint-integration.md) — three-tier pipeline, shim mechanics, recipes
- [.agent/oxlint-jsplugins-manifest.json](../oxlint-jsplugins-manifest.json) — generated map of every plugin's shim path + per-rule classification
- [scripts/audit-rule-portability.ts](../../scripts/audit-rule-portability.ts) — audit + gate (header comment cites oxlint sources)
- [scripts/generate-oxlint-shims.ts](../../scripts/generate-oxlint-shims.ts) — shim/subpath generator
- [benchmarks/suites/ilb-oxlint-parity/](../../benchmarks/suites/ilb-oxlint-parity/) — empirical parity benchmark
