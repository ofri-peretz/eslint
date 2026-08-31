---
'@interlace/eslint-plugin-secure-coding': minor
'@interlace/eslint-plugin-node-security': minor
'@interlace/eslint-plugin-nestjs-security': minor
'@interlace/eslint-plugin-lambda-security': minor
---

The last four guessed vocabularies became options

Each of these rules decided from a word we had guessed, with no way for a
consumer whose codebase spells it differently to say so:

- `detect-weak-password-validation` — `passwordWords` replaces
  `password|passphrase|passwd|pwd|pass`. A project whose field is `secret` or
  `kennwort` matched none of it and the rule judged nothing. The eight-character
  floor stays fixed and now cites NIST SP 800-63B 5.1.1.2, because that one is
  a published requirement rather than a preference.
- `no-unsafe-buffer-alloc` — `sizeNames` replaces `length|len|size|count|…`.
  It is what separates `new Uint8Array(bytes)` (a copy) from
  `new Uint8Array(n)` (an allocation), so a codebase writing `nbytes` had its
  allocations read as copies.
- `no-permissive-cors` — `environmentHintNames` replaces the environment-flag
  words. `NODE_ENV` is a Node convention but `isDev` and `devMode` were ours,
  and a project guarding on `STAGE` had its development-only CORS opening
  reported as if it shipped to production.
- `no-unvalidated-event-body` — `validationMethodNames` replaces
  `parse|validate|assert|is`. Those are generic English, not a schema library's
  API. The AWS API Gateway payload fields it reads are cited instead, since
  those names are AWS's and not ours to guess.
