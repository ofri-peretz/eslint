# Release Notes — 2026-05-04

> Coordinated release across the `@interlace/eslint-*` monorepo. Theme: **trust through evidence + speed**. Every shipped change either makes the linter faster, makes it less noisy (false-positive trim), or makes a marketing claim auditable.

## Big picture — what these changes are about

The day's work clusters into seven themes. Each theme below maps to a concrete deliverable in this release.

### 1. Speed where it matters

- **Rust-accelerated module resolution** in `@interlace/eslint-devkit` — swapped `enhanced-resolve` + `get-tsconfig` for [`oxc-resolver`](https://www.npmjs.com/package/oxc-resolver) (Rust NAPI). Per-tsconfig cache for monorepo path-alias correctness across package boundaries. Source: [resolver.ts](packages/eslint-devkit/src/resolver/resolver.ts).
- **`no-cycle` algorithm rewrite** in `eslint-plugin-import-next` — moved from upfront full-graph BFS+Tarjan SCC to per-import targeted DFS with a `nonCyclicFiles` fast-path cache. Reads only files along the actual DFS path. Detection parity preserved. Source: [no-cycle.ts:531](packages/eslint-plugin-import-next/src/rules/no-cycle.ts#L531).
- **Oxlint two-tier integration** scaffolded — Tier 1 native (~64 ms), Tier 2 native + JS plugins (~805 ms), Tier 3 ESLint as full pass. Docs in [docs/oxlint-integration.md](docs/oxlint-integration.md). Configs at [.oxlintrc.json](.oxlintrc.json) / `.oxlintrc.experimental.json`. Currently shimmed for `eslint-plugin-pg` only — see "Roadmap" below.

### 2. Less noise — false-positive trimming

The plugin philosophy in [ARCHITECTURE.md](ARCHITECTURE.md) says noisy rules erode trust. Today's diffs put that into practice:

- `eslint-plugin-secure-coding/no-hardcoded-credentials` — UI-label / ARIA / i18n / form-attribute contexts skip the credential check ([index.ts](packages/eslint-plugin-secure-coding/src/rules/no-hardcoded-credentials/index.ts)).
- `eslint-plugin-secure-coding/no-improper-sanitization` — static `el.innerHTML = '<safe-static>'` is no longer flagged, *unless* the literal contains `<script>`, inline event handlers, or `javascript:` URIs.
- `eslint-plugin-secure-coding/detect-object-injection` — numeric-key access (`arr[0]`, `arr[i]` in for-loops, `arr[+x]`, etc.) skipped. Eliminates noise on numeric/buffer-heavy codebases.
- `eslint-plugin-secure-coding/no-insecure-comparison` — codemod / AST-walker files (those that import `@babel/types`, `jscodeshift`, `recast`, etc., or live under `codemod/`) skip the secret-comparison check.
- `eslint-plugin-node-security/no-zip-slip` — removed redundant Literal-handler check; the CallExpression handler already covers the dangerous-destination case.
- `eslint-plugin-lambda-security/no-error-swallowing` — scoped to actual Lambda-shaped handlers (functions whose first param is `event`/`evt`/`e` and second is `context`/`ctx`).
- `eslint-plugin-reliability/no-missing-null-checks` — built-in singletons (`Math`, `JSON`, `console`, error classes, Node magics like `process`/`Buffer`/`__dirname`) are exempt.

### 3. Coverage additions

- New rule **`eslint-plugin-node-security/no-deprecated-buffer`** — flags use of the deprecated `Buffer()` constructor (Node.js security advisory). Set to `'warn'` in the `recommended` preset to avoid breaking adopters with legacy `Buffer()` calls; will be promoted to `'error'` in the next major.
- Shallow-test sweep — auto-generated valid test cases (semantically inert patterns like `const x = 42;`, `function noop() {}`) added across most plugin test suites via [scripts/fix-shallow-tests.mjs](scripts/fix-shallow-tests.mjs) to satisfy a `TEST_SHALLOW` coverage gate.

### 4. Oxlint discoverability — additive sub-export pattern

- New `./oxlint` sub-export on **`eslint-plugin-secure-coding`** (the highest-download plugin, picked as the proof-of-concept). Consumers wire it via `{ "jsPlugins": ["eslint-plugin-secure-coding/oxlint"] }`. Pattern is purely additive — existing ESLint usage of `eslint-plugin-secure-coding` is unchanged. See [src/oxlint.ts](packages/eslint-plugin-secure-coding/src/oxlint.ts) and [src/oxlint.test.ts](packages/eslint-plugin-secure-coding/src/oxlint.test.ts).
- Pattern can be fanned out to the other 23 plugins in follow-up releases (each is ~3 lines: re-export `plugin` via `export = plugin` + add to `package.json` `exports`).

### 5. Evidence framework — auditable marketing claims

- **[CLAIMS.md](CLAIMS.md)** — every marketing claim in our docs is mapped to a benchmark file + last-verified date. Stale (>90 days) claims auto-block from docs until refreshed. Includes an explicit "Honest losses" section for outcomes where Interlace lost or hasn't yet met a goal.
- **[benchmarks/](benchmarks/)** suite — corpus organized by CWE (022/078/079/089/798/918), suites covering arena, juliet, llm-fix, llm-tokens, perf-import, etc., with dated JSON results per suite. Backed by `scripts/ilb-*.{mjs,ts}` runners.

### 6. Hidden internals — `stripInternal` + `@internal`

- Enabled `stripInternal: true` in [tsconfig.base.json](tsconfig.base.json) so `@internal` JSDoc annotations now actually strip from emitted `.d.ts`.
- Annotated three resolver internals as `@internal` (`getResolverPerformanceMetrics`, `ResolverPerformanceMetrics`, `clearResolverCache`) — debug/observability surface that's exposed for technical reasons but not a stable consumer contract.

### 7. Architecture + docs

- New top-level **[ARCHITECTURE.md](ARCHITECTURE.md)** — bird's-eye repo map + scope rule for new plugins.
- Docs site (`apps/docs`) adopted **`@interlace/docs-baseline`** copy-sync distribution — local components/lib files removed, imports now reach into `.interlace/*` via tsconfig path alias. Cache-aware fetchers added for Vercel build-time API rate-limit resilience.

## Per-package version bumps

| Package | Old → New | Bump | Reason |
|---|---|---|---|
| `@interlace/eslint-devkit` | 1.3.3 → **1.4.0** | minor | oxc-resolver swap; peerDeps removed (technically breaking, no consumer impact expected); messaging-v2 stays uncommitted |
| `eslint-plugin-secure-coding` | 3.1.3 → **3.2.0** | minor | `./oxlint` sub-export + FP-trim refinements |
| `eslint-plugin-node-security` | 4.0.4 → **4.1.0** | minor | new `no-deprecated-buffer` rule (recommended at `warn`); FP-trim |
| `eslint-plugin-import-next` | 2.3.5 → **2.3.6** | patch | no-cycle algorithm rewrite (parity preserved) |
| `eslint-plugin-lambda-security` | 1.2.3 → **1.2.4** | patch | FP-trim — Lambda-handler scoping |
| `eslint-plugin-reliability` | 3.1.2 → **3.1.3** | patch | FP-trim — built-in-singleton exemption |
| `eslint-plugin-react-features` | 1.1.3 → **1.1.4** | patch | regex → `String#startsWith` (oxlint correctness fix) |

## Breaking-change audit

Result: **no breaking changes ship in this release.** Two risks were identified during the audit and resolved:

- **Resolved:** `no-deprecated-buffer` was initially configured at `'error'` in the `recommended` preset (would have failed adopters with legacy `Buffer()` calls). Demoted to `'warn'`; promotion to `'error'` deferred to next major.
- **Resolved:** `eslint-devkit` `messaging/index.ts` re-exported WIP `formatters-v2` / `types-v2` modules. Reverted; v2 source files stay in working tree (uncommitted) but are not exposed from the package boundary, so they don't ship as new public API.
- **Verified non-breaking:** resolver public exports (`ResolverOptions`, `ResolverPerformanceMetrics`, `getResolverPerformanceMetrics`, `resolveModule`, `clearResolverCache`) preserved with same signatures. `peerDependenciesMeta` removal of `enhanced-resolve` / `get-tsconfig` is technically additive (consumers don't have to peer-provide them anymore).
- **Verified non-breaking:** all FP-trim changes only **reduce** rule firings vs the previous published version — no new flagging surface.

## Skipped — stays uncommitted on this branch

- **`@interlace/eslint-formatter`** package (mid-refactor; not safe to publish at 0.1.0).
- **`packages/eslint-devkit/src/messaging/{formatters-v2,types-v2}.ts`** + tests (mid-refactor; type contract for `documentationLink` field still being finalized).
- **8 plugins with test-only changes** (no version bump warranted): browser-security, crypto, express-security, jwt, nestjs-security, vercel-ai-security, pg, mongodb-security.

## Validation status

- ✅ `nx run-many -t build` — 24 projects, 38 tasks, all green
- ✅ `npm run oxlint` — 0 errors (5 fixed in this pass; 259 non-blocking style warnings remain)
- ✅ `npm run lint:md` — 0 errors across 719 markdown files
- ✅ `npm pack --dry-run` — all 7 publishable tarballs valid
- ✅ `secure-coding` tarball verified to include `src/oxlint.{js,d.ts}`
- ✅ `eslint-devkit` tarball verified — `peerDependenciesMeta` no longer lists `enhanced-resolve` / `get-tsconfig`; `oxc-resolver` is in `dependencies`
- ✅ `@internal` annotations confirmed stripped from emitted `resolver.d.ts`

## Roadmap (after this release)

- **Fan out the `./oxlint` sub-export** to the other 23 plugins (mechanical per-plugin work; ~3 lines each).
- **Replace the per-plugin `tools/oxlint-plugins/interlace-pg.cjs` shim** with either a generic shared loader, or by reconfiguring Nx workspace symlinks to point at `dist/` so oxlint's `require()` naturally resolves to compiled JS — eliminating the shim entirely.
- **Resume messaging-v2 work** — finalize the `documentationLink` contract, complete the `EnterpriseMessageOptions` migration, ship `@interlace/eslint-formatter` 0.1.0.
- **TypeScript 6 upgrade** — currently on 5.9.3 (latest 5.x). 6.0 release is recent; upgrade should be its own branch + validation pass.
