# ADR 0014 — eslint-plugin-react-features accepts Node 20.19

- **Status:** accepted
- **Date:** 2026-11-24
- **Deciders:** @ofri-peretz
- **Amends:** [ADR 0010](./0010-published-packages-require-node-22-13.md) and
  [ADR 0013](./0013-import-next-runs-on-node-20-19.md) for
  `eslint-plugin-react-features` and `oxlint-plugin-react-features`

## Context

`eslint-plugin-react-features` is sold as a drop-in for `eslint-plugin-react`,
whose latest release (7.37.5) peers on ESLint up to 9.x, which holds back the
move to ESLint 10 in the repos that use it. ESLint 10 declares `^20.19.0 || ^22.13.0 || >=24`. The package declared
`>=22.13.0` (ADR 0010), so a project on Node 20.19 could run ESLint 10 but could
not take this package under its declared engines (Yarn 1 refuses it by default,
npm and pnpm do with `engine-strict`).

ADR 0013 made the same exception for `eslint-plugin-import-next` and the devkit
after measuring that nothing in them needed Node 22. The same measurement was
made here, on 2026-11-24, Node 20.19.0 (nvm), ESLint 10.14.0:

- The unit suite of `eslint-plugin-react-features` passes: 103 files, 3,381
  tests passed, 0 failed. The 2,382 skipped are the oxlint half of every rule
  test, which the dual rule tester skips below Node 22 (oxlint's `RuleTester`
  does not start there, as in ADR 0013). On Node 24 the oxlint half runs.
- The package's only Node imports are `node:fs`, `node:module`
  (`createRequire`) and `node:path`, in `src/utils/react-settings.ts`. A scan
  for `fs.globSync`, `import.meta.dirname`, `Array.fromAsync`, the new `Set`
  methods, `Promise.withResolvers`, `Object.groupBy` and
  `process.getBuiltinModule` found none. The package is CommonJS, so
  `require(esm)` is not involved.
- Its one runtime dependency, `@interlace/eslint-devkit`, already declares
  `^20.19.0 || ^22.13.0 || >=24` (ADR 0013).

## Decision

- `eslint-plugin-react-features` and `oxlint-plugin-react-features` (copied by
  `scripts/generate-oxlint-aliases.mts`) declare `^20.19.0 || ^22.13.0 || >=24`.
  A lower floor is non-breaking, so it is released as a minor.
- `node-version-matrix.yml` runs the package's unit tests on Node 20.19.0
  nightly and on `workflow_dispatch`, in the cell ADR 0013 added.
- Every other published package keeps ADR 0010's `>=22.13.0`.

## Consequences

- The floor claim rests on a test that runs, not on a declaration.
- On Node 20 the oxlint-engine cases are not run by any job. A break that only
  shows for an oxlint user on Node 20 would not be caught. The oxlint half
  passes on the Node 24 PR run.
- When ESLint drops Node 20, this ADR and ADR 0013 are reversed together and
  the packages go back to ADR 0010's floor in a major.
