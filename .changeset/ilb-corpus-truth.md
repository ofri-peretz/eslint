---
'@interlace/benchmarks': minor
---

Add ILB-Corpus-Truth — the bench that measures behaviour on code we did not write

Every existing bench measures accuracy on fixtures we authored or curated, and
is therefore structurally blind to one failure mode: a rule that fires on files
having nothing to do with its SDK. Measured by hand on 2026-08-10, **one finding
in three across the SDK plugins was about an SDK the file never imports**, and
four plugins were fixed on the strength of that number.

`npm run ilb:corpus-truth` makes that measurement repeatable over 107 pinned
repositories (~107k files): per rule it reports findings, off-SDK findings,
yield against the files that do carry the SDK, cross-plugin CWE collisions, and
whether the rule fired at all. It fails when any rule reports more off-SDK
findings than its recorded baseline, or when a new rule arrives already
reporting off-SDK.

The per-PR half is `benchmarks/__tests__/sdk-gate-coverage.lock.test.ts`, which
asks the same question in seconds and carries a two-way ratchet of which plugins
still owe a module gate.
