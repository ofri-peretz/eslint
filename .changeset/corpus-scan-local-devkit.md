---
'@interlace/eslint-devkit': patch
---

`corpus-scan --local` now actually measures the local working tree.

Three layers of staleness, each hiding the next:

1. **The devkit came from npm.** Every plugin declares
   `@interlace/eslint-devkit` as a semver *range*, so npm resolved it from the
   registry and the rig ran local plugins against the **published** devkit.
   Everything living there — `isTestFilePath`, `createRule`'s skip flags, every
   shared detector — was measured at whatever was last released, while the
   report said "LOCAL WORKING TREE".

2. **The fingerprint did not cover it.** `distHash` ran over the plugins only,
   so a devkit-only change left the rig stamped unchanged.

3. **npm's cache served the old tarball.** `--install-links` packs each `file:`
   dependency under `name@version`, and a rebuild does not bump the version.
   The rig now uses a private cache directory, dropped whenever the fingerprint
   changes.

This surfaced loudly — `isGeneratedFile is not a function`, on 8 of 8 targets —
only because the change added a *new* export. A change to an existing one is
silent: the scan runs, produces a number, and the number describes code that is
not in the tree.

It explains a measurement that had been recorded as unexplained.
`react-features/hooks-exhaustive-deps` read 84 on some runs and 91 on others,
and plugin staleness, npm cache and filesystem case-sensitivity had each been
ruled out. Against a correctly local rig it reads **84**. The 91 was the
published devkit.
