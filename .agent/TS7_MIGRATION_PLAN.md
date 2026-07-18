# TypeScript 7 side-by-side migration — validated plan

## Goal
Adopt TS 7 (the native Go compiler, GA 2026-07-08, shipped as the standard
`typescript` package / native `tsc`) for typechecking while keeping TS 6 for
typescript-eslint (which supports only `>=4.8.4 <6.1.0`; no TS 7 until 7.1).
Side-by-side: native TS 7 `tsc` for typecheck, TS 6 stays under
typescript-eslint (via `@typescript/typescript6` / `tsc6`).

## Measured speed (this repo, spike) — the honest number
Spike measured the pre-GA native compiler (`@typescript/native-preview` /
`tsgo`, superseded by the GA `typescript` package — same engine):
- Single package (node-security, 105 files) `--noEmit`: TS6 2.12s → TS7 1.17s (~1.8x)
- Whole-graph `tsc -b`: TS6 41s → TS7 22s (~1.9x)
- 23 separate per-package TS7 invocations: 27s → 31s (SLOWER — Go startup paid 23x)
- **Conclusion: ~2x here, NOT the 10x headline** (repo is many small packages;
  10x is for huge single graphs). To get even ~2x, typecheck must run as ONE
  whole-graph build, not 23 turbo per-package tasks.

## Root blocker (validated)
The repo typechecks via **source-aliasing**: `tsconfig.base.json` sets
`baseUrl:"."` + `paths` mapping every workspace package to its sibling
`src/index.ts`. TS 7 (a) removed `baseUrl`/`downlevelIteration`/`ignoreDeprecations`,
and (b) strictly enforces `composite`'s `rootDir` — so aliasing another
package's `src` into a composite project errors with TS6059/TS6307.
The incompatible case is specifically **cross-package `paths` aliases that
point into a sibling package's `src` from a composite project** — that's what
this repo does. TS 7 still supports `paths` mappings that target locations
within the project's own configured root; it's the sibling-`src`-into-composite
pattern that breaks.

The fix direction (validated): resolve cross-package imports via **built
`dist` declarations + project references**, not source. `turbo typecheck`
already `dependsOn: ["^build"]`, so build-first ordering exists.

## Open systemic issue to solve (where the spike stopped)
After removing the source-alias `paths`, a TS6 `tsc -b` whole-graph build
still throws **1051× TS2307 "Cannot find module '@interlace/eslint-devkit'"**
across ALL plugins — even though:
- devkit's `dist/src/index.d.ts` exists after build,
- `node_modules/@interlace/eslint-devkit` symlink exists,
- `node -e require.resolve('@interlace/eslint-devkit')` resolves fine,
- plugins already `references` devkit in `tsconfig.lib.json`.
So under TS Node16 + project references, the module specifier isn't resolving
to the built declaration. Likely cause to investigate: mismatch between the
reference's expected declaration output (outDir/declarationDir) and where
`exports.types` points, or a Node16 `exports`/conditions nuance. This is the
crux to crack first — once one plugin→devkit import resolves via dist, the
pattern replicates.

## Migration steps
1. `tsconfig.base.json`: remove `baseUrl`, `downlevelIteration`,
   `ignoreDeprecations`, and the whole source-alias `paths` block.
2. Solve and verify dist-resolution for `@interlace/*` + `eslint-plugin-*`
   under `moduleResolution: Node16` + project references. **Acceptance
   criteria (a partial fix must not advance the migration):** one representative
   plugin resolves `@interlace/eslint-devkit` to its built declaration file
   (capture the `exports.types`/declaration path and `--traceResolution`
   evidence), and a whole-graph build produces **zero TS2307 errors**.
3. Add `references` to `packages/eslint-config-interlace/tsconfig.lib.json`
   (currently `[]`; it imports all 20 packages) for correct build order.
   Add devkit reference to deprecated `eslint-plugin-crypto` if it's kept.
4. Move typecheck to a whole-graph `tsc -b` (one invocation) rather than 23
   per-package turbo tasks — otherwise TS7's per-invocation startup makes it
   slower. **Packaging (TS 7.0 GA, 2026-07-08):** TS 7 now ships as the standard
   `typescript` package (native `tsc`) — `@typescript/native-preview` (`tsgo`)
   was the pre-GA preview and is superseded. Keep typescript-eslint on TS 6 via
   Microsoft's `@typescript/typescript6` (provides `tsc6`), aliased in
   `package.json` (e.g. so the `typescript` module typescript-eslint imports
   resolves to 6.x while the fast native `tsc` runs typecheck). The exact alias
   wiring — which package name backs the module each tool imports — is part of
   this step and must be validated, since typescript-eslint requires the TS 6
   compiler API (`<6.1.0`) until TS 7.1 ships a stable one.
5. Verify green: build, typecheck (native `tsc`), oxlint (unaffected — Rust),
   vitest (~4), and full CI. typescript-eslint stays TS6 until 7.1.

## Cross-package dependency graph (for the references)
- Every `eslint-plugin-*` imports only `@interlace/eslint-devkit` (and already
  references it — except deprecated `eslint-plugin-crypto`).
- `eslint-config-interlace` imports ALL 20 packages + devkit — needs full references.

## Constraints / gotchas
- typescript-eslint pinned TS6 (`@typescript/typescript6` or keep typescript@6
  for the lint step) until TS 7.1 ships a stable API.
- Full lockfile regen historically un-nests Storybook's vite — verify `npm ls vite`.
- oxlint 1.74 runtime already re-verified on main (#239). Never `--no-verify`.
