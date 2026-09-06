---
slug: a-published-entry-point-must-be-produced
opened: 2026-09-05
packages:
  - eslint-formatter-sarif
cases: []
---

# Intent — a published entry point must be produced

**Status:** shipped · **Opened:** 2026-09-05 · **Owner:** @ofri-peretz

---

## What is wanted

`@interlace/eslint-formatter-sarif` installs from npm and `eslint -f
@interlace/eslint-formatter-sarif` works outside this repo. And no package can
again declare a `main` that nothing produces or ships, whether or not anyone
notices at release time.

## Why now

The package was in four contradictory states at once, measured on
`origin/main` at `df0e271db`:

- `package.json` carried `"private": true` (added in #105), so `release.yml`
  never publishes it — `npm view @interlace/eslint-formatter-sarif` is a 404.
- Its README opens with `npm install --save-dev @interlace/eslint-formatter-sarif`.
- `main` and `exports` point at `./dist/src/index.mjs`, but there is no `build`
  script and `files` lists only `src`, so even a manual publish would ship a
  tarball whose entry point does not exist.
- `ROADMAP.md` marks it ✅ Stable, `supply-chain-attestation.yml` attests it by
  default, the docs site documents it, and `examples/vulnerable-app` runs it —
  which works only through the workspace symlink.

This is the second package in the same shape: `@interlace/eslint-formatter` sat
identically, and #105 hid both behind `private: true` rather than fixing the
entry point. Every artifact gate in the repo (`check-published-artifacts`,
`verify-dist-integrity`, `check-artifact-size`) runs on a BUILT `dist/`, so a
package that cannot build is invisible to all of them.

## Affected users and systems

`packages/eslint-formatter-sarif`, `scripts/build-package.ts` (every package
builds through it), `codecov.yml`, the artifact-size baseline, and the npm
registry: `@interlace/eslint-formatter-sarif@0.2.0` appears as a first release.

## Constraints

- Publish through the existing `dist/` contract in `scripts/build-package.ts`
  and `release.yml`; no second publish path.
- The formatter stays plain `.mjs` with its existing 100% coverage suite — no
  TypeScript rewrite to fit the compile step.
- `@interlace/eslint-formatter` stays private; it is a separate decision.
- Per CLAUDE.md: the lock must be shown to fail on the unfixed state.

## Success criteria

- `npm run build` in `packages/eslint-formatter-sarif` emits
  `dist/package.json` with `main: ./src/index.mjs` and that file exists.
- `npm run check-published-artifacts` passes with the sarif dist present.
- `scripts/__tests__/published-entry-points-are-produced.lock.test.ts` fails
  when either the `build` script or the `src` entry in `files` is removed, and
  `prove-locks` records both proofs.
- A changeset exists so the next release publishes `0.2.0` as a first release.

## Open questions

- Does `@interlace/eslint-formatter` follow? It is in the same pre-fix shape and
  now has a build mode that would work for it; whether it ships is a product
  call, not a build one.
