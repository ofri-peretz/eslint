---
'eslint-plugin-node-security': patch
---

`detect-non-literal-fs-filename` now resolves `const` path bindings through
scope instead of by name.

The binding table was a file-wide `Map` keyed on the bare identifier, so the
last `const` of a given name in the file won everywhere. Two consequences, both
measured: a path composed entirely of literals was reported as CWE-22 because an
unrelated `const p` appeared later in the file, and — the serious direction — a
genuine path traversal went silent when any later `const` of the same name
existed, including a top-level one in a function containing no fs call at all.
`reportUnresolvedPaths` could not recover the silenced finding, because the path
did resolve; just to the wrong initialiser.

Bindings are now resolved through ESLint's scope analysis, which is what this
plugin's README already promises. The one-hop and `const`-only restrictions and
the `Program:exit` deferral are unchanged.

Also fixes a crash: a `for (const x of …)` head is a `const` declarator whose
`init` is `null`, and asserting it non-null passed `null` into the taint walker,
which threw `TypeError: Cannot read properties of null` and aborted the entire
lint run rather than reporting anything.
