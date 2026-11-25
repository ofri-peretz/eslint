---
'eslint-plugin-secure-coding': patch
'oxlint-plugin-secure-coding': patch
---

fix(secure-coding): no-hardcoded-credentials no longer reports an OpenAPI path template (`'/access-token/{id}'`) or a slash-namespaced error code (`'infra_token/invalid_token'`) as a credential
