---
'eslint-plugin-postgresql-security': patch
---

fix: `c['release']()` is the same client release

`no-missing-client-release` matched the release call on `property.name`. With
it resolved the rule now gives the MORE precise finding on a subscripted
release outside a `finally` — `releaseNotGuaranteed` rather than
`missingClientRelease`.
