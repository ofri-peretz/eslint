---
'eslint-plugin-postgresql-security': patch
---

fix: `pool['connect']()` checks out the same client

`no-missing-client-release` matched the checkout on `property.name`, so a
subscripted connect never entered the release tracking at all.
