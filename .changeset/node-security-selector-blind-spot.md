---
'eslint-plugin-node-security': patch
---

fix: `b['readUInt8'](0, true)` reaches the bounds-check visitor

`no-buffer-overread` selected its visitor with
`CallExpression[callee.computed=false][callee.property.type="Identifier"]`, so
the subscripted spelling never reached the rule at all — the blind spot was in
the SELECTOR STRING rather than in a guard the body could be read for.
`Buffer['alloc'](n)` was missed the same way.
