---
'eslint-plugin-maintainability': patch
---

`identical-functions` no longer erases the things that tell two functions
apart. Three bugs in `normalizeBody`:

**Keywords were renamed.** The pattern `[a-z_$][a-zA-Z0-9_$]*` matches
`return`, `throw`, `if` and `this` as well as bindings, so these compared
identical:

```js
return client.create(id)   //  VAR VAR.VAR(VAR)
throw  client.create(id)   //  VAR VAR.VAR(VAR)
```

Once bindings are generic, control flow is the only thing left to compare.

**Comments ran last**, after whitespace had been collapsed onto one line — at
which point `//.*` deletes from the first line comment to the *end of the
function*. Two bodies were compared as their opening lines.

**String contents were renamed**, so `"/api/v1/authn/recovery/password"` and
`"/api/v1/authn/recovery/unlock"` both became `"/VAR/VAR/VAR/VAR/VAR"` and two
methods calling different endpoints matched at 100%.

Property names are now preserved too — `.create(x)` and `.destroy(x)` are not
the same call.

**3,530 → 2,082** on the pinned corpus. What remains is real duplication,
1,643 of it in a generated SDK.
