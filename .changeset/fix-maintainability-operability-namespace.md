---
'eslint-plugin-maintainability': patch
'eslint-plugin-operability': patch
---

fix: republish `recommended` preset with the correct plugin namespace

The published builds of `eslint-plugin-maintainability` and
`eslint-plugin-operability` shipped a `recommended` config whose plugin KEY
(`@interlace/maintainability`) did not match its rule PREFIX
(`@interlace/maintainability/maintainability/…` — doubled). ESLint cannot
resolve that, so spreading `...configs.recommended` throws
"could not find plugin" the moment a consumer lints a file — under both
ESLint 9 and 10.

The source was corrected in the 2026-05-16 namespace cleanup (alongside
`react-features`, which has since been republished via other changesets), but
these two plugins were never bumped — so npm still serves the broken builds and
they are the only two doubled-namespace plugins still unfixed downstream. This
republishes them from the corrected source.

Regression lock: `packages/eslint-config-interlace/src/ecosystem-integrity.test.ts`
loads every plugin's every config preset into a real ESLint instance and fails
if any rule→plugin reference cannot be resolved. Run it against the built
`dist/` in the release pipeline (pre-publish) to also catch a stale-artifact
publish — the failure mode that let these two ship broken.
