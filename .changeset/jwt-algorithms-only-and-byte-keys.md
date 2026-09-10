---
'eslint-plugin-jwt-security': minor
---

fix: only `algorithms` counts as an algorithm whitelist, and a byte-wrapped secret is still a secret

Two false negatives, both found in review of the API-surface work.

**`require-algorithm-whitelist` accepted `algorithm` and `alg`.** Neither exists
on the verify path. Checked against the installed packages: `jsonwebtoken`'s
`VerifyOptions` declares `algorithms?: Algorithm[]` and `jose`'s declares
`algorithms?: JWSAlgorithm[]`; `algorithm` is a _sign_ option and `alg` is a
header claim. Both spellings are ignored, so verification proceeds with
whatever algorithm the token itself names — the substitution attack this rule
exists to catch. The rule was therefore silent in exactly the case where an
author had tried to pin the algorithm and mistyped it, which is worse than not
having the rule, because it certifies the mistake. Two test cases had locked
that behaviour in as correct; they are now invalid cases.

Expect new findings on `verify(token, key, { algorithm: … })` and
`{ alg: … }`. The fix is the plural: `{ algorithms: ['RS256'] }`.

**`no-hardcoded-secret` and `no-weak-secret` could not see a byte key.** `jose`
takes `Uint8Array` for symmetric keys and its documented idiom is
`new TextEncoder().encode(secret)`. Both rules classified every call expression
as a safe key source, so the most common way to hand `jose` a hardcoded HMAC
secret was the one shape neither could inspect. `new TextEncoder().encode('…')`
and `Buffer.from('…')` are now unwrapped and the literal inside is judged as if
it had been written directly.

`no-weak-secret` measures those keys in BYTES, not in source characters. A key's
length and its strength are different numbers the moment an encoding is named:
`Buffer.from('00112233445566778899aabbccddeeff', 'hex')` is 32 characters and
16 bytes, so under the default 32-byte floor it is half strength — and counting
characters called it long enough and reported nothing. `hex`, `base64` and
`base64url` are decoded; every other encoding, and an unencoded buffer, is one
byte per character, which can never overstate the strength.

Deliberately still silent on `encoder.encode(loadSecret())` — the value is not
visible there, so there is nothing to judge.
