# ADR 0013 — eslint-plugin-import-next and its devkit accept Node 20.19

- **Status:** accepted
- **Date:** 2026-11-18
- **Deciders:** @ofri-peretz
- **Amends:** [ADR 0010](./0010-published-packages-require-node-22-13.md) for
  `eslint-plugin-import-next`, `oxlint-plugin-import-next` and
  `@interlace/eslint-devkit` only

## Context

ADR 0010 set every published package to `>=22.13.0` and rejected
`^20.19.0 || >=22.13.0` because Node 20 is end-of-life.

eslint-plugin-import-next is sold as a drop-in replacement for
eslint-plugin-import on ESLint 10. ESLint 10 declares
`^20.19.0 || ^22.13.0 || >=24`, and eslint-plugin-import-x declares
`^18.18.0 || ^20.9.0 || >=21.1.0`. A project on Node 20.19 can run ESLint 10
but could not take import-next under its declared engines: Yarn 1 refuses an
install outside `engines` by default, and npm and pnpm do with
`engine-strict`.

Measured on 2026-11-18 with Node 20.19.0 (nvm), ESLint 10.14.0:

- The unit suites of eslint-plugin-import-next and @interlace/eslint-devkit
  pass on their ESLint half. Every failure on Node 20 was oxlint's `RuleTester`
  refusing to start (`oxlint/dist/plugins-dev.js`: "not supported on ...
  versions of NodeJS prior to v22.0.0"). That is the oxlint test tool, not the
  plugin.
- The oxlint CLI 1.90.0 loaded `eslint-plugin-import-next/oxlint` through
  `jsPlugins` and reported on Node 20.19.0. oxlint's own `engines` is
  `^20.19.0 || >=22.12.0`.
- No source in either package uses an API newer than Node 20.19. A scan for
  `fs.globSync`, `import.meta.dirname`, `Array.fromAsync`, the new `Set`
  methods, `Promise.withResolvers` and `process.getBuiltinModule` found none.
  `require(esm)` is not used.

## Decision

- `eslint-plugin-import-next`, `oxlint-plugin-import-next` (copied by
  `scripts/generate-oxlint-aliases.mts`) and `@interlace/eslint-devkit`, which
  import-next depends on at runtime, declare `^20.19.0 || ^22.13.0 || >=24`,
  ESLint 10's range. A lower floor is non-breaking, so it is released as a
  minor.
- `node-version-matrix.yml` gets a Node 20.19.0 cell for those two packages'
  unit tests, nightly and on `workflow_dispatch`, like the 22.13.0 and 26
  cells. On Node below 22 the dual rule tester registers the oxlint half as
  skipped, visibly, because oxlint's `RuleTester` cannot run there.
- Every other published package stays on ADR 0010's `>=22.13.0`.

## Consequences

- The floor claim for import-next rests on a test that runs, not on a
  declaration.
- On Node 20 the oxlint-engine cases are not run by any job. The oxlint CLI
  path was checked by hand once (above). A break there would show only for an
  oxlint user on Node 20.
- When ESLint drops Node 20, this ADR is reversed and these packages go back to
  ADR 0010's floor in a major.
