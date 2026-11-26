---
'eslint-plugin-secure-coding': patch
---

`no-sensitive-data-exposure` no longer reports a name that ends in what a secret is called, where it lives or how much of it there is. The default `descriptorSegments` now also hold `id`, `ids`, `name`, `path`, `count`, `length`, `size`, `type` and `kind`, so `tokenCount` in a usage log, `secretPath` in a webhook log object and `secretName` in an error message are not reported. The comparison is still the whole final segment of the name: `token`, `accessToken`, `passwordHash` and `tokenIdValue` keep reporting, and `descriptorSegments` can drop any of the new ones. Seen on LibreChat, Infisical and Budibase.
