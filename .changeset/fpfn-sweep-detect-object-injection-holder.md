---
'eslint-plugin-secure-coding': patch
---

fix: `detect-object-injection` honours `Object.create(null)` reached through a property

The `Object.create(null)` exemption resolved a bare binding but bailed the moment the
null-prototype map was held as a property of another object. `const flags = { bools:
Object.create(null) }` then reported `flags.bools[key] = true` at CVSS 9.8 — eight times in
one burgee file — while the identical `safeObj[key] = value` one scope away stayed silent.

The safety property `SPEC.md` G1 states is about the _target_ ("target is
`Object.create(null)`"), with no qualification about how the target is spelled. The holder
is now resolved and the written property's initializer read. Everything the resolution
cannot read — a private name, a non-literal holder, a computed or quoted key, a plain `{}`
— still reports, each pinned by its own fixture.
