---
'eslint-plugin-reliability': patch
---

`no-missing-null-checks` no longer treats declare-then-assign as a null value.

```js
let childModel = null
childModel = result.childModel
childModel.hooks              // no longer reported
```

The zero-writes rule was applied to `let x;` but not to `let x = null`, so the
most common shape in JavaScript reported every use that followed. A `const`
cannot be reassigned, so a genuine `const c = null; c.value` still reports.

Found by the 20-repository case ledger, which read **4,954** findings where the
8-repository corpus read 127 — a 15× per-repo gap that was the fix, not the
corpus. **4,954 → 1,743.**
