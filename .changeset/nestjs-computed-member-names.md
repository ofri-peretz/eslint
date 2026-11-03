---
'eslint-plugin-nestjs-security': patch
---

fix(nestjs-security): a class member declared with a computed string key is the same member

`['password']: string` now names the field `password`, as `password: string` does, so `no-exposed-private-fields` reports it. A handler declared `['findAll']()` is named in `require-guards` and `require-throttler` messages instead of `<anonymous>`, which is now kept for keys only known at runtime.
