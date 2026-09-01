---
'eslint-plugin-react-features': minor
---

fix: `items['map'](…)` is the same iteration as `items.map(…)`

`jsx-key` — `items['map'](i => <li />)` and `Array['from'](items, fn)` reach the same properties the dotted spelling does, and the rule went
silent on it. That is the notation bundlers emit, so the rule was off on built
output.

A dynamic `o[m]` still names nothing and is still ignored.
