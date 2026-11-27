# Design — a prototype-key denylist and serialised JSON are not findings

## Approach

- `detect-object-injection`: `bodyGuardsKey` reads `if (SET.has(key)) continue;`
  (also `includes`, and a `return` or `throw` exit) as a REJECTION of the set's
  members. It guards a recursive merge only when the set is a single `const`
  holding an array literal, a frozen array, or `new Set` of one, and names
  `__proto__`, `constructor` and `prototype`. Then all three pollution keys count
  as named, exactly as the `key === '__proto__' || …` spelling already did. A
  rejection test is never credited as an allowlist, whoever owns the set.
- `no-improper-sanitization`: a literal whose dangerous-context walk reaches
  `JSON.stringify(...)` before the output call stops there. `JSON.stringify` quotes
  it as data. A literal carrying `<script>`, an inline handler or `javascript:`
  still reports.

## Rejected

- **Recognising the denylist by its name** (`FORBIDDEN`, `DENY`, `BLOCKED`). A name
  is not provenance: a renamed set must be read the same way, and a set called
  `FORBIDDEN` that misses `prototype` must still report.
- **Crediting partial denylists alongside `===` checks for the missing key.** That
  needs per-key bookkeeping across spellings. The combined form was not seen in
  real code, and all-or-nothing reports more, never less.
- **Treating every `JSON.stringify` argument as safe.** A serialised literal that
  carries executable markup still reaches an HTML sink when the JSON is embedded
  in a page.
- **Type-aware resolution of the set's contents.** The literal is in the same
  file, so the type-unaware read is exact for every case seen.
