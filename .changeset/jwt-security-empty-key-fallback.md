---
'eslint-plugin-jwt-security': patch
---

fix: no-hardcoded-secret and no-weak-secret skip an empty-string key fallback

`process.env.JWT_SECRET ?? ''` was reported both as a hardcoded secret and as a weak one. An empty key signs and verifies nothing: jsonwebtoken throws "secretOrPrivateKey must have a value", and jose throws "Zero-length key is not supported". So the fallback fails closed and puts no credential in the source. LibreChat uses it in five verify calls. A non-empty fallback (`?? 'changeme'`) still reports.
