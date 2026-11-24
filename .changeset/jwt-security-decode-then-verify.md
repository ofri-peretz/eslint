---
'eslint-plugin-jwt-security': patch
---

fix: no-decode-without-verify accepts a decode that the same function then verifies

The function must verify the same token binding unconditionally, with `algorithms` pinned to literals. A reset token signed with a per-user secret has to be decoded to find its user before it can be verified (brocoders/nestjs-boilerplate).
