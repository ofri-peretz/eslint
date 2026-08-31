---
'@interlace/eslint-plugin-node-security': patch
---

`no-unsafe-buffer-alloc` has fixtures for the `countNames` option

`countNames` is what separates `new Uint8Array(bytes)` — a copy — from
`new Uint8Array(n)` — an allocation, so a codebase spelling its size `nbytes`
had its allocations read as copies. The option now has the pair that proves it:
one fixture where the default vocabulary misses the allocation, and one where
naming the spelling reaches it.
