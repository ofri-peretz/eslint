---
'eslint-plugin-import-next': patch
---

Correct the unmeasured "up to 100x faster" claim in the 2.0.0 CHANGELOG entry.

`CHANGELOG.md` ships in this package's `files` array, so the claim was published to npm. No benchmark measures 100x: the verified figures are **3.1x faster end-to-end** and **8x faster in pure rule execution** against `eslint-plugin-import` 2.32.0 on a 5,736-file / 455K-LoC React codebase. The entry now carries an inline correction rather than a silent rewrite of release history — see `CLAIMS.md` § Withdrawn claims.

Docs-only. No rule behaviour changes.
