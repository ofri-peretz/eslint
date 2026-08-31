---
'@interlace/eslint-plugin-import-next': patch
'@interlace/eslint-plugin-node-security': patch
'@interlace/eslint-plugin-secure-coding': patch
---

`no-mutable-exports` resolves bindings instead of grepping the file text

The `export { x }` path built a regex from the declarator's name and tested it
against the whole source. That reported on the characters appearing in a
comment or a string, reported a local `let x` when the file re-exported some
other module's `x`, reported a function-scoped `let` colliding with an
exported name, and missed every export it could not spell: a multi-specifier
list, a rename, and a destructured declarator. It now resolves the specifier
through the scope chain to the declaration it actually names.

`no-env-injection` gains `requestRootNames`, which REPLACES the request-root
list that `extraRequestRoots` could only grow.
