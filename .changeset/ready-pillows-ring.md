---
---

Test-infrastructure only — no published artifact changes.

De-flakes the pre-push `turbo run test` fan-out: `no-deprecated-plugin-references`
now scans via `git grep` (tracked files only) instead of walking the working tree,
and the I/O-bound lock suites in `docs` / `eslint-formatter` get a timeout that
reflects cold-cache reality rather than vitest's 5s default.
