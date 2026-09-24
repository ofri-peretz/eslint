---
'eslint-plugin-node-security': patch
---

fix(node-security): path guards no longer leak across functions; destructured `basename`/`sep` recognised

`no-arbitrary-file-access` kept its `path.basename()` and `startsWith()` state per variable NAME for the whole
file, so `const p = …; if (!p.startsWith('/safe/')) throw …` in one function silenced an unguarded
`const p = req.query.g; fs.readFileSync(p)` in another. The state is now keyed on the scope variable. The
`startsWith()` guard is also matched on the AST instead of the source text: it must be
`!<same variable>.startsWith(…)` with a throw/return, placed before the sink, so a guard after the read, or
`file` matching inside `other.startsWith('/files/')`, no longer counts. The prefix must also be
separator-anchored (`'/safe/'`, `base + path.sep`, `` `${base}/` ``): `'/safebad/x'.startsWith('/safe')` is
true, so an unanchored guard is reported, matching `detect-non-literal-fs-filename`. An inline
`path.join('/uploads', path.basename(req.query.f))`, the mitigation the docs recommend, is no longer reported.

`detect-non-literal-fs-filename` now accepts `import { basename, sep } from 'node:path'` the way it already
accepted `path.basename` and `path.sep`.
