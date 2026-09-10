---
'eslint-plugin-maintainability': patch
---

fix(maintainability): `identical-functions` stops calling private accessors identical

`getDetectLocale() { return this.#detectLocale }` and `getExitProcess() { return
this.#exitProcess }` were reported as "15 duplicates (100% similar)"; the public
spelling of the same class was silent.

The normaliser renames bindings to `VAR` but deliberately keeps member names —
`.create(x)` is not `.destroy(x)`. The guard that protects them looked for a
literal `.` immediately before the name, and `#` is a non-word character, so
every private accessor normalised to `this.#VAR`. The 100% figure came from a
string-identity short-circuit, true only because the differing token had been
discarded. The suggested remedy was impossible anyway: `#` names are not
reflectable, so no generic accessor can replace them.

The guard now accepts `#` with or without a preceding dot, which also covers
`#brand in obj`. On the burgee corpus: 27 reports to 24.
