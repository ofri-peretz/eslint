# TypeScript 7 side-by-side migration — validated plan

## Goal
Adopt TS 7 (native `tsgo`) for typechecking while keeping TS 6 for
typescript-eslint (which supports only `>=4.8.4 <6.1.0`; no TS 7 until 7.1).
Side-by-side: `tsgo` for `tsc` typecheck, TS 6 stays under typescript-eslint.

## Measured speed (this repo, spike) — the honest number
- Single package (node-security, 105 files) `--noEmit`: TS6 2.12s → TS7 1.17s (~1.8x)
- Whole-graph `tsc -b` vs `tsgo -b`: 41s → 22s (~1.9x)
- 23 separate per-package `tsgo` invocations: 27s → 31s (SLOWER — Go startup paid 23x)
- **Conclusion: ~2x here, NOT the 10x headline** (repo is many small packages;
  10x is for huge single graphs). To get even ~2x, typecheck must run as ONE
  whole-graph build, not 23 turbo per-package tasks.

## Root blocker (validated)
The repo typechecks via **source-aliasing**: `tsconfig.base.json` sets
`baseUrl:"."` + `paths` mapping every workspace package to its sibling
`src/index.ts`. TS 7 (a) removed `baseUrl`/`downlevelIteration`/`ignoreDeprecations`,
and (b) strictly enforces `composite`'s `rootDir` — so aliasing another
package's `src` into a composite project errors with TS6059/TS6307.
Source-aliasing is fundamentally incompatible with TS 7.

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
2. Solve the dist-resolution issue for `@interlace/*` + `eslint-plugin-*`
   under `moduleResolution: Node16` + project references (the open issue above).
3. Add `references` to `packages/eslint-config-interlace/tsconfig.lib.json`
   (currently `[]`; it imports all 20 packages) for correct build order.
   Add devkit reference to deprecated `eslint-plugin-crypto` if it's kept.
4. Move typecheck to whole-graph `tsgo -b` (one invocation) rather than 23
   per-package turbo tasks — otherwise TS7 is slower. Keep TS6 `tsc` available
   only for typescript-eslint (install `@typescript/native-preview` for tsgo;
   keep `typescript@6.0.3`).
5. Verify green: build, typecheck (tsgo), oxlint (unaffected — Rust),
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
