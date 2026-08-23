---
'@interlace/eslint-devkit': patch
---

`corpus-scan` can install its targets, and `no-extraneous-dependencies` was
never unmeasurable.

**The exclusion was wrong.** `no-extraneous-dependencies` compares imports
against `package.json`, not against the installed tree. It reports the same 10
findings on auth0/express-openid-connect before and after an install. It was
excluded by association with `no-unresolved`, and **1,067 findings** were
invisible to the gate for no reason. It is budgeted now.

The exclusion was argued at length in a doc comment, and the argument was still
wrong. An exclusion needs the same evidence as a budget — "it is about
dependencies" is a name, not a measurement.

**New `--install-targets` flag.** Installs each target's dependencies before
scanning, with `--ignore-scripts` — not optional, and test-pinned. These are
eight third-party repositories pinned by SHA; a lifecycle script in any of them
would run with the privileges of whoever runs the scan, and nothing here needs
a build to run. All 8 install in 5.3 minutes and 5 GB, so the flag is opt-in
rather than default.

Measured: `no-unresolved` **8,904 → 5,585**. The 3,319 removed were bare
specifiers. The 5,585 remaining are dominated by 4,451 relative imports in
Shopify/cli of files graphql-codegen writes at *build* time — an install cannot
reach those, so that half stays excluded, honestly: in a fresh checkout the
file really is absent.

**Measurability is decided by the targets, not by the flag.** `node_modules`
survives in the shared cache, so a run without the flag would otherwise resolve
everything while claiming it could not. `--update` refuses outright when the
flag and the actual state disagree, which caught a budget of
`no-unresolved: 2630` being written into a file CI evaluates against bare
clones.

`react-features/hooks-exhaustive-deps` ratchets 91 → 84.
