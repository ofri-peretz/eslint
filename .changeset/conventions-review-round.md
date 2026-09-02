---
'eslint-plugin-conventions': patch
---

fix: `no-deprecated-api` reads a subscripted member, and its suggestion stays valid

`obj['deprecatedMethod']()` calls exactly the API `obj.deprecatedMethod()`
calls; the rule matched on `property.name` and ignored it. A test had pinned
that miss under a run named after the coverage line it existed to execute,
with the genuine refusal `obj[propName]()` listed beside it as though the two
were the same case.

The fixer needed correcting in the same change: writing the bare replacement
over a computed property produced `obj[newMethod]()` — a reference to a
variable that does not exist, offered to the user as the fix. A computed
property now keeps its quotes.
