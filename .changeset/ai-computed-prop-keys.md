---
'eslint-plugin-vercel-ai-security': patch
---

Don't read a computed property key as if it were a property name.

`getStaticPropName` took a key node and returned `key.name` for any Identifier,
without checking whether the property was computed. In `{ [instructions]: value }`
the key node *is* an Identifier called `instructions` — but it's a variable
reference, and the property actually being set is whatever that variable holds.
All four rules that resolve the system prompt (`no-dynamic-system-prompt`,
`require-validated-prompt`, `require-rag-content-validation`,
`no-sensitive-in-prompt`) therefore treated an arbitrary property as the system
prompt.

The helper now takes the `Property` node and returns `null` for computed keys.

This only misfires when the variable is named exactly like the property, which is
why the existing computed-key fixtures missed it — they used variables named
`key` and `originKey`. The new regression test uses the collision case.

Found while fixing the identical bug in `eslint-plugin-nestjs-security`; the same
helper shape had been copied between the two plugins.
