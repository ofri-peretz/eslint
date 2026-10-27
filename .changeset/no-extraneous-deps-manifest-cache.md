---
'eslint-plugin-import-next': patch
---

perf(import-next): `no-extraneous-dependencies` stops re-reading unchanged package.json files

The rule found, read and parsed the nearest `package.json` again for every linted
file. It now caches the lookup per directory and the parsed manifest per path,
revalidated by mtime, so an editor session still sees edits to `package.json`.
Measured on oxlint 1.88 over ~1,100 files: the rule's added cost went from 0.66 s
to within noise (median of 5 runs), with identical findings (539 → 539).
