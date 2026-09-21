---
'eslint-plugin-react-features': patch
---

fix: `jsx-key` suggested `key={item.id}` against callbacks that bind no `item`

`getIteratorCallbackParamName` returned a name only when the callback's first parameter was an `Identifier`; every other shape — a destructured `({ id, name })`, an array pattern, no parameter at all — fell through to a hard-coded `return 'item'`, which the fixer interpolated verbatim. ESLint applies an accepted suggestion to the source as written, so the result either threw `ReferenceError: item is not defined` at render or, nested inside an outer `.map(item => …)`, resolved silently to the OUTER row and pinned one constant key on every element of the inner list — the reconciliation bug this rule exists to prevent, with React's own "missing key" warning removed along with it.

A destructured parameter now yields the identifier the pattern already binds (`({ id }) → key={id}`, `({ id: rowId }) → key={rowId}`, read through `objectKeyName` so quoted and computed-but-static keys agree). When no key expression can be derived the report stands on its own and no suggestion is offered. Three pre-existing fixtures asserted the old output and were justified in their own comments by the implementation's fallback ("since param is destructured, fallback is 'item'"); under `AGENTS.md` those pin implementation rather than behaviour, and they have been corrected.
