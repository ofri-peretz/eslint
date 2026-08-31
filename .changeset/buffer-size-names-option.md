---
'@interlace/eslint-plugin-node-security': minor
---

`no-unsafe-buffer-alloc` takes `sizeNames`

The name of the first argument is what separates `new Uint8Array(bytes)` — a
copy — from `new Uint8Array(n)` — an allocation. The rule matched that against
`length|len|size|count|n|num|total|capacity|byteLength`, which is our guess, so
a codebase spelling it `nbytes` had its allocations read as copies and went
unjudged. `sizeNames` replaces the list.

It also compared `node.property.name` directly, so a size reached by a computed
key (`header['length']`) was invisible. It now resolves the property through
`propertyName`.
