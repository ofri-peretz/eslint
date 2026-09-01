---
'eslint-plugin-secure-coding': minor
---

**✨ Feature** — `no-hardcoded-session-tokens` gains `sessionWords`

The rule reports two independent things and only one was ever ours to guess.

A JWT (`eyJ…`, RFC 7519) and a `Bearer`-prefixed value (RFC 6750) are published
**formats**: they report on the literal's value whatever the binding is called,
and no option silences them.

The other half was a **name** test — `session` and `token`, hardcoded in
English. A project whose session id is `sesion`, `sitzung` or `koneksi` got
nothing from it and had no way to ask. `sessionWords` REPLACES that list:

```json
"secure-coding/no-hardcoded-session-tokens": [
  "error",
  { "sessionWords": ["session", "sesion", "sitzung"] }
]
```

Default unchanged, so nothing moves unless you set it.
