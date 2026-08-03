---
---

No published artifact changes — `docs/` is not in any package's `files` array,
so the corrected rule documentation reaches users through eslint.interlace.tools
rather than the npm tarball.

Three things landed:

1. `no-deprecated-plugin-references` scans via `git grep` over tracked files
   instead of walking the working tree with `grep -r` (15.4s cold → 0.24s).
2. `documentation-standards` had resolved its workspace root one level above the
   repo, so it had been passing vacuously. Fixing it activated 24 tests and
   surfaced ~26 broken config examples across the docs — `'architecture/'` and
   stale `'secure-coding/'` rule prefixes, wrong npm package attributions, and
   two references to rules that do not exist.
3. Every package vitest config now carries a 30s testTimeout floor, so the
   47-task pre-push fan-out stops mis-reporting I/O contention as failure.
