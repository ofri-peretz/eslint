# Design — a published entry point must be produced

Intent: [`intent.md`](./intent.md). **Status:** shipped.

---

## Requirements

- **R1** `@interlace/eslint-formatter-sarif` is not private and has a `build`
  script that emits a publishable `dist/` through `scripts/build-package.ts`.
- **R2** The published manifest carries every field `check-published-artifacts`
  requires (author, homepage, bugs, funding, engines, repository.directory) and
  a LICENSE file.
- **R3** For every non-private package, each entry point (`main`, `types`,
  every leaf of `exports`) is produced — a `build` script exists when it lives
  under `dist/`, the file exists on disk otherwise — and sits inside `files`.
- **R4** The lock in R3 fails when the sarif `build` script or its `src` files
  entry is removed, and both mutations are declared as `@provenBy` proofs.
- **R5** The package is measured: a codecov component, and an entry in the
  artifact-size baseline.

## Design

**Path chosen: publish it.** The alternative — keep it internal and rewrite the
README, roadmap, docs site, supply-chain default set and example to say so —
touches more surfaces to deliver less, for a package with a real implementation
and a 100%-covered test suite.

1. `scripts/build-package.ts` gains a plain-JavaScript mode: when a package has
   no `tsconfig` at all, `src/` (minus tests) is copied to `dist/src/` and the
   script falls through to the same manifest rewrite every compiled package
   uses. One build contract, one publish path.
2. `packages/eslint-formatter-sarif/package.json`: drop `private`, add `build`,
   add `dist` and `LICENSE` to `files`, add the required metadata, align the
   ESLint peer range with the README (`^8.40.0 || ^9.0.0 || ^10.0.0`).
3. `codecov.yml`: remove the package from `ignore`, add its component — the
   existing `codecov-measures-what-ships` lock demands both once it ships.
4. The lock: `scripts/__tests__/published-entry-points-are-produced.lock.test.ts`.
5. README: delete the section linking to `.github/actions/audit`, which #105
   removed.

## Verification

```
npx vitest run --config scripts/__tests__/vitest.config.mts scripts/__tests__/published-entry-points-are-produced.lock.test.ts
npx tsx scripts/prove-locks.mts --file scripts/__tests__/published-entry-points-are-produced.lock.test.ts
npm run build --workspace=@interlace/eslint-formatter-sarif && npm run check-published-artifacts
```

The lock was also run by hand against the pre-fix manifest with `private`
removed (the state a publish would have shipped): it fails on the missing
`build` script.

## Rejected alternatives

- **Keep it internal (path B).** More edits, and it leaves a working, tested
  formatter that the docs site and the MITRE CWE-compatibility claim already
  rely on off npm.
- **Point `main` at `./src/index.mjs` and skip the build.** `release.yml`
  publishes from `<pkg>/dist` unconditionally and hard-fails when it is missing;
  a second publish path for one package is the kind of exception that rots.
- **Convert the formatter to TypeScript.** Fits the compile step for free, but
  rewrites a 100%-covered module to change nothing a consumer sees.
- **Lock private packages too.** `@interlace/eslint-formatter` would fail today;
  whether it ships is its own decision, and a private dangling `main` reaches
  no one.

## Out of scope

- Publishing `@interlace/eslint-formatter`.
- `supply-chain-attestation.yml` packs from the source directory, not `dist/`,
  for every package; that is a pre-existing property of that workflow.
