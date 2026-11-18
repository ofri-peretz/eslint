---
'eslint-plugin-node-security': patch
'oxlint-plugin-node-security': patch
---

fix(node-security): no-timing-unsafe-compare drops dead separator spellings of the token compounds

`api_token`, `x-session-token` and similar already match the whole-word
`token` default, because a separator is a word boundary. So the `_` and `-`
spellings of `apiToken`, `sessionToken`, `idToken` and `csrfToken` (added in
PR 1581, not yet published) matched nothing the rule did not already match.
The camelCase compounds stay: they catch a lowercase `apitoken`. No behaviour
change.
