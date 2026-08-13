---
'eslint-plugin-jwt-security': major
---

`no-algorithm-none` no longer reports decoding, and the whole plugin now works
in CommonJS.

**Breaking:** `no-algorithm-none` no longer emits `decodeWithoutVerify`. That
site belongs to `no-decode-without-verify`, which reports it with its own
severity, its own docs and its own fix — the two rules were reporting the same
line for the same reason. Enable `no-decode-without-verify` (it is in
`recommended`) and drop any suppression that named `decodeWithoutVerify` on
`no-algorithm-none`.

**The plugin was silent on CommonJS.** Its module gate read `ImportDeclaration`
only, so `const jwt = require('jsonwebtoken')` — and `import jwt =
require(...)`, `require('jsonwebtoken').decode`, a destructured require, a
side-effect require — left every rule switched off. It now resolves the
specifier for each of those spellings.

Two false-positive classes went with it:

```js
new TextDecoder().decode(bytes);                              // not JWT decoding
await new SignJWT(claims).setExpirationTime('2h').sign(key);  // does set an expiry
```

The gate now checks the receiver against a list of non-JWT constructors, and
`require-expiration` follows jose's fluent builder through the chain instead of
looking only at the object literal. `FlattenedSign`, `CompactSign` and
`GeneralSign` are exempt outright — JWS has no `exp` claim to set.
