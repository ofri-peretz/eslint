---
'eslint-plugin-browser-security': patch
---

fix(browser-security): `no-clickjacking` recognises a camelCase fetch directive

A policy is recognised by CSP3's own list of fetch directives rather than by an `-src` suffix, so a camelCase `scriptSrc` policy without `frame-ancestors` is reported like its kebab-case form.
