---
'@interlace/benchmarks': patch
---

fix: the corpus scan stops reporting every target as failed

`sh()` enriched a failed command's error with the child's output and rethrew a
bare `new Error`, which dropped the `stdout` property. `scanTarget` reads
exactly that property to tell "ESLint found findings" — it exits non-zero
whenever it reports anything — from "ESLint could not run". So the moment any
target held one error-severity finding, the scan declared
`every target failed to scan — no findings were measured` and no budget was
ever checked.

The enrichment added to explain failures was manufacturing them. It now
carries `stdout`/`stderr` through, and the scan measures 6200 findings across
8/8 targets.
