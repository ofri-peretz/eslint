---
'eslint-plugin-reliability': patch
---

`no-missing-null-checks` no longer loses its evidence through an alias or a
conditional.

```js
const hit = rows.find((r) => r.id === id)
const alias = hit
alias.name                    // now reported — one alias used to launder it

const chosen = flag ? rows.find((r) => r.ok) : null
chosen.name                   // now reported — a null arm is evidence
```

Found by an adversarial wave written to break the rule shipped in `4.0.0`:
**11 of 14 genuine null-dereferences walked past it.** Four are now fixed — these two plus a bare `undefined` arm and an alias
resolved from the wrong scope. The remaining nine need analysis the rule does
not have and are recorded, each with a cited limit and the condition that reopens
it, in `benchmarks/rule-corpus/reliability__no-missing-null-checks/SEAL.json`.
