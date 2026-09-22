---
'eslint-plugin-secure-coding': patch
---

fix: `detect-object-injection` no longer lets a `hasOwn` guard clear a write to a different object

`Object.hasOwn(src, k)` proves `k` is an own data property of `src` and nothing
about `dst`, so `dst[k] = v` with `k === '__proto__'` still reaches the
prototype setter — and in the recursive merge spelling it walks into
`Object.prototype`. The matcher checked only the key argument, so a guard
naming any object at all cleared the write. The guarded object must now be the
written one, or a module-owned allowlist. The copy-loop path no longer clears
on the token `hasOwn` appearing anywhere in the body, and a dangerous-key guard
is recognised by the key being a string literal rather than by matching
`prototype` as text, which an accessor also contains.
