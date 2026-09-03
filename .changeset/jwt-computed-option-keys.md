---
'eslint-plugin-jwt-security': patch
---

A computed or quoted option key is still a JWT option.

Five rules required an Identifier property key, so they saw
`{ algorithms: ['none'] }` and missed both `{ 'algorithms': ['none'] }` —
ordinary hand-written JavaScript — and `{ ['algorithms']: ['none'] }`, which is
what a bundler emits. All five read their options through `extractAlgorithms`,
`hasOption` and `getOptionValue`, and fixing those three covers the plugin.

`require-issued-at` was the sharpest case: it demanded an Identifier key for
`iat`, so a token that HAS an issued-at claim written `{ ['iat']: now }` was
reported as missing one — the rule fired on correct code.

A key chosen at runtime (`{ [name]: value }`) still names nothing readable and
is still skipped.
