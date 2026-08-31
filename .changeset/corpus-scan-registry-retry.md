---
---

fix(scripts): the corpus scan retries registry propagation, and nothing else

`Scan pinned corpus` installs the plugin versions a release just published. For
the minute or two before the registry serves them everywhere, that install 404s
— so one green release turns every open PR red at once. It happened five times
in a single evening; every pinned dependency resolved by hand minutes later.

The cost is not the red run. It is the habit: a required check that cries wolf
gets re-run reflexively, and the day it fails for a real reason — a corpus
regression, a genuinely missing version — nobody reads it.

Three attempts, ten seconds apart, and **only for a resolution failure**:
`E404`, `ETARGET`, `No matching version found`, `is not in this registry`. A
dependency conflict, a bad lockfile, ENOSPC or a permissions error fails on the
first attempt exactly as before. A blanket retry would have been the wolf-crying
this exists to prevent.

Locked on both halves — that the transient cases retry, and that five real
failures do not. Verified by sabotage: widening the predicate to `return true`
fails five assertions, removing the attempt cap fails one.
