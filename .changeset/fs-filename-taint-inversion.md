---
'eslint-plugin-node-security': minor
---

`detect-non-literal-fs-filename` now reports on reachable taint instead of on
unproven constancy.

Adjudicated against an 8-repo corpus, reading the real source at every site:
**113 findings, 8 of them true — 7% precision.** The other 105 were rollup
configs, gulpfiles, glob enumerations of a repo's own files, and thin fs
facades forwarding their own parameter.

The cause was one line:

```js
// Any non-literal is dangerous
return !pathNode || !isLiteralString(pathNode);
```

That asks *"can I prove this is constant?"* and reports whenever it cannot.
Adding further constant-recognition was measured to reach only ~32% precision,
because the question is backwards. A path is dangerous when an attacker can
**steer** it, so that is what is asked now.

Measured after: **113 → 9**, and the survivors are genuine — `process.env.TWILIO_CA_BUNDLE`,
`process.argv[2]`, `env.processEnv.XDG_*`.

**False negatives fixed at the same time**, all found during adjudication:

- **Destructive methods were missing entirely.** `cp`, `cpSync`, `rm`, `rmSync`,
  `copyFile(Sync)`, `rename(Sync)`, `truncate(Sync)`, `symlink`, `link`,
  `utimes`, `chmod`, `open`, `opendir`. `Shopify/cli` `bin/update-bugsnag.js:36`
  does `fs.cpSync(sourceDirectory, …)` with `sourceDirectory` built from
  `process.argv[2]` — a recursive copy driven by argv, **silent**, while the
  harmless `mkdir` of a temp dir two lines above **reported**. The rule flagged
  the safe thing and missed the dangerous one.
- **Only `arguments[0]` was ever examined.** `copyFile`, `cp`, `rename`, `link`
  and `symlink` all take a destination too. Now checked via a per-method index
  map.
- **`fs-extra` and `graceful-fs` were invisible** despite re-exporting the whole
  fs surface under the same names. A test asserting `isFsModule('fs-extra')`
  was `false` had pinned this.

Two new options: `taintSources` (default `['process']`) and
`reportUnresolvedPaths` (default `false`, restores the previous contract).

Request-sourced paths and function parameters are deliberately **not** taint
roots here — `no-arbitrary-file-access` owns those at `error` and names user
input as the cause. Listing them in both rebuilds the 25-site double-report the
two rules were just separated to avoid.
