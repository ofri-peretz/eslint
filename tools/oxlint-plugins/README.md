# `tools/oxlint-plugins/` — Oxlint JS-Plugin Shims

Oxlint shim files (one per `@interlace/eslint-plugin-*` package) that expose our ESLint rules to oxlint's JS-plugin tier. Each shim loads the built plugin from `packages/<plugin>/dist/` and patches module resolution so workspace `@interlace/*` deps resolve to compiled JS rather than TypeScript source.

> **Generated, do not hand-edit.** These files are produced by [`../../scripts/generate-oxlint-shims.mjs`](../../scripts/generate-oxlint-shims.ts) and regenerated whenever a new plugin is added. To update one, regenerate; to add a new shim, add the source plugin and re-run the generator.

## Two-tier lint pipeline

These shims power the **type-unaware tier** of the lint pipeline — see [`../../docs/oxlint-integration.md`](../../docs/oxlint-integration.md) for the full architecture (oxlint primary, ESLint for type-aware/complex rules).

## Verification

The [`../../scripts/verify-oxlint-shims.mjs`](../../scripts/verify-oxlint-shims.ts) script is a CI gate that fails when shims drift from the source plugins. Run via the [`oxlint-parity.yml`](../../.github/workflows/oxlint-parity.yml) workflow.
