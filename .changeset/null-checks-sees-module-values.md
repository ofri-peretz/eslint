---
'eslint-plugin-reliability': patch
---

`no-missing-null-checks` now sees through two initialiser shapes it already
handles when written differently.

```js
var pets = exports.pets = [];   // the init is the ASSIGNMENT, not the array
const u = require('u');         // the CommonJS twin of `import u from 'u'`
```

The first meant the array literal two tokens away was never inspected, so every
later use of `pets` drew a CWE-476 report. The second is the twin of the
`ImportBinding` case the rule already exempts — and a failed `require` *throws*,
it does not evaluate to null, so a module object is at least as non-null as an
ESM import binding.

`require` is resolved as a binding, not matched by spelling: a locally-declared
`require` is a different function with no such contract, and still reports. Only
plain `=` chains are unwrapped, because `||=` and `??=` can evaluate to the left
operand.

**Scope, honestly:** measured over the 20-repository corpus, this removed 2,977
of 29,814 findings across 4,000 files — **10%**. This rule is 56% of everything
`recommended` reports across all 30 plugins, and these two bugs are not why. The
remaining volume is the rule reporting any member access it cannot prove
non-null, which in untyped JavaScript is most member accesses.
